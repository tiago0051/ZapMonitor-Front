import type { FC } from "react";

type KanbanColumnProps = {
  title: string;
  children?: React.ReactNode;
};

export const KanbanColumn: FC<KanbanColumnProps> = ({ title, children }) => {
  return (
    <div className="w-80 border-x border-b h-full rounded-sm bg-secondary overflow-auto">
      <div className="border-b border-t px-4 py-2 bg-primary">
        <h3 className="text-lg font-bold text-primary-foreground">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
};
