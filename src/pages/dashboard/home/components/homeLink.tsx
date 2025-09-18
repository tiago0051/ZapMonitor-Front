import { cn } from "@/lib/utils";
import type { ComponentProps, FC } from "react";
import type { IconType } from "react-icons/lib";
import { Link } from "react-router";

type HomeLinkProps = ComponentProps<typeof Link> & {
  icon: IconType;
};

export const HomeLink: FC<HomeLinkProps> = ({
  className,
  icon: Icon,
  ...props
}) => {
  return (
    <Link
      className={cn(
        "text-primary border border-primary w-30 h-24 rounded-md grid justify-items-center items-center content-center justify-center text-xl gap-2",
        className
      )}
      {...props}
    >
      <Icon size={32} />
      {props.children}
    </Link>
  );
};
