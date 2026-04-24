export const appTheme = {
  token: {
    colorPrimary: '#2563eb',
    colorSuccess: '#059669',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorInfo: '#0f172a',
    colorBgBase: '#f4f7fb',
    colorTextBase: '#0f172a',
    colorTextSecondary: '#475569',
    fontFamily: '"Manrope", "Inter", "Segoe UI", sans-serif',
    borderRadius: 18,
    borderRadiusLG: 24,
    borderRadiusSM: 12,
    boxShadow:
      '0 18px 50px rgba(15, 23, 42, 0.08), 0 6px 18px rgba(15, 23, 42, 0.04)',
    controlHeight: 44,
  },
  components: {
    Layout: {
      headerBg: 'rgba(244, 247, 251, 0.72)',
      bodyBg: '#f4f7fb',
      footerBg: 'transparent',
      headerPadding: '0 24px',
    },
    Card: {
      colorBgContainer: 'rgba(255, 255, 255, 0.84)',
    },
    Button: {
      controlHeight: 44,
      fontWeight: 600,
      paddingInline: 18,
      primaryShadow: '0 14px 32px rgba(37, 99, 235, 0.24)',
    },
    Input: {
      activeBorderColor: '#2563eb',
      hoverBorderColor: '#7aa2f7',
    },
    Menu: {
      itemBg: 'transparent',
      horizontalItemBorderRadius: 999,
      itemBorderRadius: 14,
    },
    Table: {
      headerBg: 'rgba(248, 250, 252, 0.92)',
      rowHoverBg: 'rgba(37, 99, 235, 0.04)',
      borderColor: 'rgba(148, 163, 184, 0.2)',
    },
    Tabs: {
      itemColor: '#64748b',
      itemSelectedColor: '#0f172a',
      inkBarColor: '#2563eb',
    },
    Drawer: {
      colorBgElevated: 'rgba(255, 255, 255, 0.96)',
    },
    Modal: {
      contentBg: '#ffffff',
      headerBg: '#ffffff',
    },
  },
}
