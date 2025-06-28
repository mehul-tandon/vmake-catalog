import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="bg-black-secondary border-gold text-white shadow-lg shadow-gold/20">
            <div className="grid gap-1">
              {title && <ToastTitle className="text-gold font-bold">{title}</ToastTitle>}
              {description && (
                <ToastDescription className="text-gray-300">{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose className="text-white hover:text-gold focus:ring-gold" />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
