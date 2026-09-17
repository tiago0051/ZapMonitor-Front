type MemberStatus = "ACTIVE" | "INACTIVE" | "PENDING";

type Member = {
  id: string;
  name: string | null;
  email: string;
  status: MemberStatus;
  createdAt: string;
};
