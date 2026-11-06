import { PLAN_EXPIRED_CODE } from "@/services/api/api";
import { isAxiosError } from "axios";

export const isPlanExpiredError = (error: unknown) =>
  isAxiosError(error) && error.response?.status === 403 && error.response.data?.code === PLAN_EXPIRED_CODE;

/** dd/MM/yyyy de uma data YYYY-MM-DD, sem mexer no fuso. */
export const formatPlanDate = (date: string) => date.split("-").reverse().join("/");

export const PLAN_RENEWAL_MONTH_OPTIONS = [1, 3, 6, 12];
export const renewalLabel: Record<number, string> = { 1: "Mensal", 3: "Trimestral", 6: "Semestral", 12: "Anual" };
