import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router";
import { Button } from "./button";
import type { ReactNode } from "react";

type HeaderProps = {
  title: string;
  children?: ReactNode;
  onBack?: () => void;
};

export const Header = ({ title, children, onBack }: HeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-1">
        <Button onClick={() => (onBack ? onBack() : navigate(-1))} variant={"ghost"} size={"icon"}>
          <FiArrowLeft />
        </Button>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      {children}
    </div>
  );
};
