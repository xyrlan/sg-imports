import Image from "next/image";

export function Logo() {
  return (
    <div className="flex items-center gap-2 size-10 overflow-hidden rounded-full">
      <Image src="/logo.png" alt="Logo" width={200} height={200} className="object-cover" />
    </div>
  );
}