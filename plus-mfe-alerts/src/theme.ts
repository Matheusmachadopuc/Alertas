import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#216E7A",
      dark: "#174E57",
      light: "#D8F0F2",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#8B5E34",
    },
    warning: {
      main: "#C77700",
    },
    error: {
      main: "#B3261E",
    },
    background: {
      default: "#F6F8FA",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1F2933",
      secondary: "#5B6876",
    },
    divider: "#D9E2EC",
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
    h4: {
      fontWeight: 750,
      letterSpacing: 0,
    },
    h6: {
      fontWeight: 700,
      letterSpacing: 0,
    },
    button: {
      textTransform: "none",
      fontWeight: 700,
      letterSpacing: 0,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 40,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: "#334E68",
        },
      },
    },
  },
});
