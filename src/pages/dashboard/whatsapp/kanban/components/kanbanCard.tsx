export const KanbanCard = () => {
  return (
    <div className="transition-all outline outline-primary/30 hover:outline-primary/50 rounded-sm p-2 bg-primary/10 flex flex-col gap-2">
      <div>
        <h4 className="font-bold text-sm">Kanban Card</h4>
      </div>
      <div>
        <h5 className="text-xs">Em atendimento</h5>
        <p className="text-sm">Tiago Salgado</p>
      </div>
    </div>
  );
};
