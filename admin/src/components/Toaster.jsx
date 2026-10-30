import {CircleAlertIcon, CircleCheckIcon, XIcon} from "lucide-react";
import {toast, useToasts} from "../lib/toast";

const TOAST_STYLES = {
  success: {className: "alert-success", Icon: CircleCheckIcon},
  error: {className: "alert-error", Icon: CircleAlertIcon}
};

function Toaster() {
  const toasts = useToasts();

  return (
    // Pinned to the top-right of the viewport; z-index sits above DaisyUI
    // modals so toasts stay visible while one is open
    <div
      className="fixed top-4 right-4 z-[1000] flex w-max max-w-[calc(100vw-2rem)] flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map(({id, type, message}) => {
        const {className, Icon} = TOAST_STYLES[type];

        return (
          <div
            key={id}
            role={type === "error" ? "alert" : "status"}
            className={`alert ${className} shadow-lg`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span>{message}</span>
            <button
              onClick={() => toast.dismiss(id)}
              className="btn btn-xs btn-circle btn-ghost"
              aria-label="Dismiss notification"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default Toaster;
