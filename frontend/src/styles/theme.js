import { theme } from 'antd'

const { defaultAlgorithm, darkAlgorithm } = theme

export const getAppTheme = (mode = 'light') => {
  const isDark = mode === 'dark'

  return {
    algorithm: isDark ? darkAlgorithm : defaultAlgorithm,
    token: {
      colorPrimary: '#4F46E5',
      colorSuccess: '#16A34A',
      colorWarning: '#EA580C',
      colorError: '#DC2626',
      colorInfo: '#4F46E5',
      colorBgBase: isDark ? '#0F172A' : '#FFFFFF',
      colorTextBase: isDark ? '#E2E8F0' : '#0F172A',
      colorTextSecondary: isDark ? '#94A3B8' : '#64748B',
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      borderRadius: 18,
      borderRadiusLG: 24,
      borderRadiusSM: 12,
      boxShadow:
        '0 18px 48px rgba(15, 23, 42, 0.12), 0 2px 10px rgba(15, 23, 42, 0.08)',
      controlHeight: 44,
    },
    components: {
      Layout: {
        headerBg: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.88)',
        bodyBg: isDark ? '#0F172A' : '#FFFFFF',
        footerBg: 'transparent',
      },
      Card: {
        colorBgContainer: isDark ? '#111827' : '#FFFFFF',
      },
      Button: {
        controlHeight: 44,
        fontWeight: 600,
        paddingInline: 18,
      },
      Input: {
        activeBorderColor: '#4F46E5',
        hoverBorderColor: '#6366F1',
      },
      Select: {
        activeBorderColor: '#4F46E5',
        hoverBorderColor: '#6366F1',
      },
      Table: {
        headerBg: isDark ? '#172033' : '#F8FAFC',
        rowHoverBg: isDark ? '#182133' : '#EEF2FF',
        borderColor: isDark ? '#243042' : '#E2E8F0',
      },
      Tabs: {
        itemSelectedColor: '#4F46E5',
        inkBarColor: '#4F46E5',
      },
      Drawer: {
        colorBgElevated: isDark ? '#111827' : '#FFFFFF',
      },
      Modal: {
        contentBg: isDark ? '#111827' : '#FFFFFF',
        headerBg: isDark ? '#111827' : '#FFFFFF',
      },
    },
  }
}
