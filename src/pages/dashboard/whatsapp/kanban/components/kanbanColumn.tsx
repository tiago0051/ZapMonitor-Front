import { useEffect, useRef, type FC } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

type KanbanColumnProps = {
  title: string;
  children?: React.ReactNode;
  isDroppable?: boolean;
  count?: number;
};

export const KanbanColumn: FC<KanbanColumnProps> = ({ title, children, isDroppable, count }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;

    if (!el) return;
    if (!isDroppable) return;

    return dropTargetForElements({
      element: el,
    });
  }, [isDroppable]);

  return (
    <div className="bg-secondary grid h-full w-80 shrink-0 grid-rows-[min-content_auto] overflow-hidden rounded-sm border-x border-b">
      <div className="bg-primary flex justify-between border-t border-b px-4 py-2">
        <h3 className="text-primary-foreground text-lg font-bold">{title}</h3>
        {count !== undefined && count > 0 && <span className="text-primary-foreground">{count}</span>}
      </div>
      <div className="h-full space-y-3 overflow-auto p-4">{children}</div>
    </div>
  );
};
