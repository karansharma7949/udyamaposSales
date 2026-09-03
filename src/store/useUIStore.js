import { create } from 'zustand'

/**
 * Store for global UI state.
 */
export const useUIStore = create((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

  notification: null, // { message: string, type: 'success' | 'error' | 'info' }
  setNotification: (notification) => set({ notification }),
  clearNotification: () => set({ notification: null }),
}))
