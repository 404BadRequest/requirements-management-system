export const UserAvatar = ({ name }: { name: string }) => (
  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-medium">
    {name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")}
  </div>
);
