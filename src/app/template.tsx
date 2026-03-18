export default function RootTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in-0 duration-base ease-in-out fill-mode-both">
      {children}
    </div>
  );
}
