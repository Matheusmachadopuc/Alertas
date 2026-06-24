import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";

import {
  createAlertConfig,
  deleteAlertConfig,
  getCurrentUser,
  listActiveAlerts,
  listAlertConfigs,
  updateAlertConfig,
} from "../api";
import type { AlertaEstoque, AlertaFormValues, AlertasFilters, AuthUser } from "../types";

const emptyForm: AlertaFormValues = {
  produtoId: "",
  roupaId: "",
  produtoNome: "",
  categoria: "",
  tamanho: "",
  cor: "",
  quantidadeMinima: "0",
  ativo: true,
};

const emptyFilters: AlertasFilters = {
  produtoId: "",
  categoria: "",
  tamanho: "",
  cor: "",
};

function getRoleName(user: AuthUser | null) {
  const role = user?.role;
  return typeof role === "string" ? role : role?.name;
}

function isAdmin(user: AuthUser | null) {
  return getRoleName(user)?.toLowerCase() === "admin";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function labelGrade(alerta: AlertaEstoque) {
  return [alerta.tamanho, alerta.cor].filter(Boolean).join(" / ") || "-";
}

function getStatusColor(status: AlertaEstoque["status"]) {
  if (status === "ATIVO") {
    return "error";
  }

  if (status === "ERRO") {
    return "warning";
  }

  return "success";
}

function toFormValues(alerta: AlertaEstoque): AlertaFormValues {
  return {
    produtoId: alerta.produtoId || "",
    roupaId: alerta.roupaId || "",
    produtoNome: alerta.produtoNome || "",
    categoria: alerta.categoria || "",
    tamanho: alerta.tamanho || "",
    cor: alerta.cor || "",
    quantidadeMinima: String(alerta.quantidadeMinima ?? 0),
    ativo: alerta.ativo,
  };
}

export default function AlertsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<AlertaEstoque[]>([]);
  const [configs, setConfigs] = useState<AlertaEstoque[]>([]);
  const [filters, setFilters] = useState<AlertasFilters>(emptyFilters);
  const [formValues, setFormValues] = useState<AlertaFormValues>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" | "info" } | null>(null);

  const admin = useMemo(() => isAdmin(user), [user]);

  const loadData = useCallback(async () => {
    try {
      const currentUser = user || await getCurrentUser();
      setUser(currentUser);

      const [ativos, configuracoes] = await Promise.all([
        listActiveAlerts(filters),
        isAdmin(currentUser) ? listAlertConfigs(filters) : Promise.resolve([]),
      ]);

      setActiveAlerts(ativos);
      setConfigs(configuracoes);
    } catch (error) {
      setSnackbar({
        message: error instanceof Error ? error.message : "Erro ao carregar alertas",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, user]);

  useEffect(() => {
    loadData();

    const intervalId = window.setInterval(() => {
      loadData();
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [loadData]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    window.location.href = "/login";
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormValues(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (alerta: AlertaEstoque) => {
    setEditingId(alerta.id);
    setFormValues(toFormValues(alerta));
    setDialogOpen(true);
  };

  const handleFormChange = (field: keyof AlertaFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = field === "ativo" ? event.target.checked : event.target.value;
    setFormValues((current) => ({ ...current, [field]: value }));
  };

  const handleFilterChange = (field: keyof AlertasFilters) => (event: ChangeEvent<HTMLInputElement>) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSave = async () => {
    if (!formValues.produtoId || Number(formValues.quantidadeMinima) < 0) {
      setSnackbar({ message: "Preencha produtoId e quantidade minima", severity: "error" });
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await updateAlertConfig(editingId, formValues);
        setSnackbar({ message: "Alerta atualizado", severity: "success" });
      } else {
        await createAlertConfig(formValues);
        setSnackbar({ message: "Alerta criado", severity: "success" });
      }

      setDialogOpen(false);
      await loadData();
    } catch (error) {
      setSnackbar({
        message: error instanceof Error ? error.message : "Erro ao salvar alerta",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir alerta?")) {
      return;
    }

    try {
      await deleteAlertConfig(id);
      setSnackbar({ message: "Alerta excluído", severity: "success" });
      await loadData();
    } catch (error) {
      setSnackbar({
        message: error instanceof Error ? error.message : "Erro ao excluir alerta",
        severity: "error",
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "background.default" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #7B74F5 0%, #5E56E8 100%)",
        p: { xs: 2, md: 4 },
      }}
    >
      <Container maxWidth="lg">
        {/* Cabeçalho */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
            color: "white",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Alertas de Estoque
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8 }}>
              {user?.email}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Button
              startIcon={<ArrowBackIcon />}
              href="/"
              sx={{
                borderRadius: "16px",
                px: 2.5,
                py: 1.2,
                color: "#fff",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                backdropFilter: "blur(10px)",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.95rem",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                transition: "all .2s ease",
                "&:hover": {
                  background: "rgba(255,255,255,0.2)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
                },
              }}
            >
              Voltar
            </Button>
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadData}
              sx={{
                borderRadius: "16px",
                px: 2.5,
                py: 1.2,
                color: "#fff",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                backdropFilter: "blur(10px)",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.95rem",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                transition: "all .2s ease",
                "&:hover": {
                  background: "rgba(255,255,255,0.2)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
                },
              }}
            >
              Atualizar
            </Button>
            <Button
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{
                borderRadius: "16px",
                px: 2.5,
                py: 1.2,
                color: "#fff",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                backdropFilter: "blur(10px)",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.95rem",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                transition: "all .2s ease",
                "&:hover": {
                  background: "rgba(255,255,255,0.2)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
                },
              }}
            >
              Sair
            </Button>
          </Box>
        </Box>
        {admin && activeAlerts.length > 0 && (
          <Alert
            icon={<NotificationsActiveIcon />}
            severity="warning"
            sx={{ mb: 2, borderRadius: 2 }}
          >
            {activeAlerts.length} alerta{activeAlerts.length === 1 ? "" : "s"} ativo{activeAlerts.length === 1 ? "" : "s"}
          </Alert>
        )}

        <Paper sx={{ mb: 3, borderRadius: "24px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", p: 1 }} >
          <Toolbar sx={{ gap: 2, flexWrap: "wrap", alignItems: "center", py: 1.5 }}>
            <TextField
              label="Produto"
              size="small"
              value={filters.produtoId}
              onChange={handleFilterChange("produtoId")}
              sx={{ minWidth: { xs: "100%", sm: 220 } }}
            />
            <TextField
              label="Categoria"
              size="small"
              value={filters.categoria}
              onChange={handleFilterChange("categoria")}
              sx={{ minWidth: { xs: "100%", sm: 180 } }}
            />
            <TextField
              label="Tamanho"
              size="small"
              value={filters.tamanho}
              onChange={handleFilterChange("tamanho")}
              sx={{ width: { xs: "100%", sm: 140 } }}
            />
            <TextField
              label="Cor"
              size="small"
              value={filters.cor}
              onChange={handleFilterChange("cor")}
              sx={{ width: { xs: "100%", sm: 160 } }}
            />
            <Box sx={{ flex: 1 }} />
            {admin && (
              <Button startIcon={<AddIcon />} variant="contained" onClick={openCreateDialog}>
                Novo alerta
              </Button>
            )}
          </Toolbar>
        </Paper>

        <Stack spacing={3}>
          <Paper sx={{ borderRadius: "24px", overflow: "hidden", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", p: 2 }} >
            <Toolbar sx={{ minHeight: 64 }}>
              <Typography variant="h6" sx={{ flex: 1 }}>
                Alertas ativos
              </Typography>
              <Chip label={activeAlerts.length} color={activeAlerts.length ? "error" : "success"} size="small" />
            </Toolbar>
            <Divider />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Produto</TableCell>
                    <TableCell>Categoria</TableCell>
                    <TableCell>Grade</TableCell>
                    <TableCell align="right">Saldo</TableCell>
                    <TableCell align="right">Limite</TableCell>
                    <TableCell>Verificado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeAlerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        Nenhum alerta ativo
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeAlerts.map((alerta) => (
                      <TableRow key={alerta.id} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700 }}>{alerta.produtoNome || alerta.produtoId}</Typography>
                          <Typography variant="caption" color="text.secondary">{alerta.roupaId || alerta.produtoId}</Typography>
                        </TableCell>
                        <TableCell>{alerta.categoria || "-"}</TableCell>
                        <TableCell>{labelGrade(alerta)}</TableCell>
                        <TableCell align="right">{alerta.ultimoSaldo ?? "-"}</TableCell>
                        <TableCell align="right">{alerta.quantidadeMinima}</TableCell>
                        <TableCell>{formatDate(alerta.ultimaVerificacaoEm)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {admin && (
            <Paper sx={{ borderRadius: "24px", overflow: "hidden", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", p: 2 }} >
              <Toolbar sx={{ minHeight: 64 }}>
                <Typography variant="h6" sx={{ flex: 1 }}>
                  Configurações
                </Typography>
                <Chip label={configs.length} size="small" />
              </Toolbar>
              <Divider />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell>Categoria</TableCell>
                      <TableCell>Grade</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Saldo</TableCell>
                      <TableCell align="right">Limite</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {configs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                          Nenhuma configuracao encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      configs.map((alerta) => (
                        <TableRow key={alerta.id} hover>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700 }}>{alerta.produtoNome || alerta.produtoId}</Typography>
                            <Typography variant="caption" color="text.secondary">{alerta.roupaId || alerta.produtoId}</Typography>
                          </TableCell>
                          <TableCell>{alerta.categoria || "-"}</TableCell>
                          <TableCell>{labelGrade(alerta)}</TableCell>
                          <TableCell>
                            <Chip
                              label={alerta.ativo ? alerta.status : "INATIVO"}
                              color={alerta.ativo ? getStatusColor(alerta.status) : "default"}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">{alerta.ultimoSaldo ?? "-"}</TableCell>
                          <TableCell align="right">{alerta.quantidadeMinima}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Editar">
                              <IconButton onClick={() => openEditDialog(alerta)} aria-label="Editar">
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <IconButton onClick={() => handleDelete(alerta.id)} aria-label="Excluir">
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Stack>
      </Container>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? "Editar alerta" : "Novo alerta"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.25} sx={{ pt: 1 }}>
            <TextField
              label="Produto ID"
              value={formValues.produtoId}
              onChange={handleFormChange("produtoId")}
              required
              fullWidth
            />
            <TextField
              label="Roupa ID"
              value={formValues.roupaId}
              onChange={handleFormChange("roupaId")}
              fullWidth
            />
            <TextField
              label="Nome do produto"
              value={formValues.produtoNome}
              onChange={handleFormChange("produtoNome")}
              fullWidth
            />
            <TextField
              label="Categoria"
              value={formValues.categoria}
              onChange={handleFormChange("categoria")}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Tamanho"
                value={formValues.tamanho}
                onChange={handleFormChange("tamanho")}
                fullWidth
              />
              <TextField
                label="Cor"
                value={formValues.cor}
                onChange={handleFormChange("cor")}
                fullWidth
              />
            </Stack>
            <TextField
              label="Quantidade mínima"
              type="number"
              value={formValues.quantidadeMinima}
              onChange={handleFormChange("quantidadeMinima")}
              required
              fullWidth
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <FormControlLabel
              control={<Switch checked={formValues.ativo} onChange={handleFormChange("ativo")} />}
              label="Ativo"
            />
            <TextField
              select
              label="Origem"
              value={formValues.roupaId ? "roupa" : "produto"}
              disabled
              fullWidth
            >
              <MenuItem value="produto">Produto / grade</MenuItem>
              <MenuItem value="roupa">Roupa especifica</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button startIcon={<SaveIcon />} variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4500}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
