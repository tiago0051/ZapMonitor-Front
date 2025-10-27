import { Outlet } from "react-router";

export const LoginLayout = () => {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="https://zapmonitor.devsoftbr.com">
            <img src="/assets/logo.svg" alt="Logo ZapMonitor" className="w-50" />
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Outlet />
          {/* <div className="w-full max-w-xs"></div> */}
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/assets/login/sideImage.jpg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
};
