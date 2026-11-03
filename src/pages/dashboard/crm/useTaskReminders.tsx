import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { isBrowserNotificationSupported } from "@/pages/dashboard/whatsapp/notifications/useNotificationPreferences";
import { crmService } from "@/services/api/crmService";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useLocalStorage } from "usehooks-ts";

const REFRESH_INTERVAL_MS = 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;
// Lembretes de tarefas vencidas há mais tempo que isso já apareceram como atrasadas; não vale tocar agora
const MAX_REMINDER_DELAY_MS = 24 * 60 * 60 * 1000;

/**
 * Avisa quando vence uma tarefa atribuída ao usuário, em qualquer tela do tenant: um toast e, com a permissão do
 * navegador concedida, uma notificação. Cada tarefa avisa uma vez por navegador.
 */
export const useTaskReminders = (enabled: boolean) => {
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  const [notifiedTaskIds, setNotifiedTaskIds] = useLocalStorage<string[]>(`crm:notifiedTasks:${client.id}`, []);

  const tasksQuery = useQuery({
    queryKey: ["crm", "myTasks", client.id],
    queryFn: () => crmService.findMyTasks({ params: { clientId: client.id } }),
    enabled,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => setNow(Date.now()), CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled]);

  useEffect(() => {
    const tasks = tasksQuery.data ?? [];
    const dueTasks = tasks.filter((task) => {
      const dueAt = new Date(task.dueAt).getTime();
      return dueAt <= now && now - dueAt < MAX_REMINDER_DELAY_MS && !notifiedTaskIds.includes(task.id);
    });
    if (dueTasks.length === 0) return;

    const openTasks = () => navigate(`${baseUrl}/crm?tab=tasks`);

    dueTasks.forEach((task) => {
      toast(`Tarefa vencendo: ${task.title}`, { description: task.deal.title, action: { label: "Ver tarefas", onClick: openTasks } });

      if (isBrowserNotificationSupported() && Notification.permission === "granted") {
        const notification = new Notification(`Tarefa vencendo: ${task.title}`, { body: task.deal.title, tag: `crm-task-${task.id}` });
        notification.onclick = () => {
          window.focus();
          openTasks();
        };
      }
    });

    // Mantém só as tarefas ainda abertas, para a lista não crescer sem limite
    const openIds = new Set(tasks.map((task) => task.id));
    setNotifiedTaskIds([...notifiedTaskIds.filter((id) => openIds.has(id)), ...dueTasks.map((task) => task.id)]);
  }, [tasksQuery.data, now]);
};
