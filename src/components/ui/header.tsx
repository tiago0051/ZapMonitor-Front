type HeaderProps = {
  title: string;
};

export const Header = ({ title }: HeaderProps) => {
  return (
    <div className="flex justify-between">
      <h1 className="text-2xl font-bold">{title}</h1>
    </div>
  );
};
