import { useToastStore } from '../store/toast-store'

export const useToast = () => {
  const pushToast = useToastStore((state) => state.pushToast)

  return {
    toast: pushToast,
  }
}
