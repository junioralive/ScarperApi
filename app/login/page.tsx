import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-medium">
            <Image
              src="/logo.svg"
              alt="Logo"
              width={40}
              height={40}
              className="size-10"
            />
            <span className="text-xl font-semibold">ScraperAPI</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden lg:block bg-linear-to-br from-green-500 to-emerald-600">
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <Image
            src="/logo.svg"
            alt="ScraperAPI Logo"
            width={400}
            height={400}
            className="object-contain"
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-md text-white text-center space-y-4">
            <h2 className="text-3xl font-bold">Welcome to ScraperAPI</h2>
            <p className="text-lg opacity-90">
              The most powerful web scraping solution for developers and businesses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
