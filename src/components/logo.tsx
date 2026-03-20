import Image from "next/image";

export function Logo() {
  return (
    <div className="flex gap-4 items-center">
      <div className="relative size-10 overflow-hidden rounded-full p-0.5">
        <Image src="/logo-black.png" alt="Logo" width={40} height={40} className="object-cover dark:hidden" />
        <Image src="/logo-white.png" alt="Logo" width={40} height={40} className="object-cover hidden dark:block" />
      </div>
      <h1 className="text-xl font-mono font-black tracking-widest">SoulGlobal</h1>
    </div>
  );
}