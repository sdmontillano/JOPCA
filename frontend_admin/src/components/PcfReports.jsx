import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Button, ButtonGroup,
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Chip, CircularProgress, Alert,
  Tabs, Tab, TextField, Grid, Divider
} from '@mui/material';
import {
  Download as DownloadIcon,
  Print as PrintIcon,
  Description as DescriptionIcon,
  CalendarMonth as CalendarIcon,
  Assessment as AssessmentIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

import api from '../services/tokenService';
import { useToast } from '../ToastContext';

const formatPeso = (amount) => {
  if (amount === null || amount === undefined) return '₱0.00';
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
};

const PcfReports = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const { showToast } = useToast();
  
  // Date states
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [weeklyStart, setWeeklyStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [weeklyEnd, setWeeklyEnd] = useState(new Date().toISOString().split('T')[0]);
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1);

  const fetchReport = async (type, params = {}) => {
    setLoading(true);
    setError(null);
    setReportData(null);
    
    try {
      let url = `/api/reports/pcf-${type}/`;
      const queryParams = new URLSearchParams(params).toString();
      if (queryParams) url += `?${queryParams}`;
      
      const response = await api.get(url);
      setReportData(response.data);
    } catch (err) {
      const errorMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to load report';
      setError(String(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      let url = `/api/reports/export/excel/?type=`;
      
      if (activeTab === 0) {
        url += `daily&date=${dailyDate}`;
      } else if (activeTab === 1) {
        url += `weekly&start=${weeklyStart}&end=${weeklyEnd}`;
      } else if (activeTab === 2) {
        url += `monthly&year=${monthlyYear}&month=${monthlyMonth}`;
      } else {
        url += `unreplenished`;
      }
      
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `PCF_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      showToast("Report exported successfully!", "success");
    } catch (err) {
      const errorMsg = err?.response?.data?.detail || err?.message || 'Failed to export Excel';
      showToast(errorMsg, "error");
    }
  };

  const handleExportPdf = async () => {
    try {
      let url = `/api/reports/export/pdf/?type=`;
      
      if (activeTab === 0) {
        url += `daily&date=${dailyDate}`;
      } else if (activeTab === 1) {
        url += `weekly&start=${weeklyStart}&end=${weeklyEnd}`;
      } else if (activeTab === 2) {
        url += `monthly&year=${monthlyYear}&month=${monthlyMonth}`;
      } else {
        url += `unreplenished`;
      }
      
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `PCF_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      showToast("Report exported successfully!", "success");
    } catch (err) {
      const errorMsg = err?.response?.data?.detail || err?.message || 'Failed to export PDF';
      showToast(errorMsg, "error");
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setReportData(null);
    setError(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon color="primary" />
          <Typography variant="h5" fontWeight="bold">PCF Reports</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <ButtonGroup size="small">
            <Button startIcon={<PrintIcon />} onClick={handlePrint} variant="outlined">
              Print
            </Button>
            <Button startIcon={<DownloadIcon />} onClick={handleExportExcel} variant="outlined">
              Excel
            </Button>
            <Button startIcon={<DownloadIcon />} onClick={handleExportPdf} variant="outlined">
              PDF
            </Button>
          </ButtonGroup>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{
              borderColor: "#E5E7EB",
              color: "#475569",
              "&:hover": { bgcolor: "#F3F4F6", borderColor: "#D1D5DB" },
            }}
          >
            Back
          </Button>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Daily Report" icon={<CalendarIcon />} iconPosition="start" />
        <Tab label="Weekly Report" icon={<DescriptionIcon />} iconPosition="start" />
        <Tab label="Monthly Report" icon={<DescriptionIcon />} iconPosition="start" />
        <Tab label="Unreplenished Aging" icon={<DescriptionIcon />} iconPosition="start" />
      </Tabs>

      {/* Daily Report Tab */}
      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
            <TextField
              type="date"
              label="Date"
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <Button variant="contained" onClick={() => fetchReport('daily', { date: dailyDate })}>
              Generate Report
            </Button>
          </Box>
        </Box>
      )}

      {/* Weekly Report Tab */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
            <TextField
              type="date"
              label="Start Date"
              value={weeklyStart}
              onChange={(e) => setWeeklyStart(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="date"
              label="End Date"
              value={weeklyEnd}
              onChange={(e) => setWeeklyEnd(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <Button variant="contained" onClick={() => fetchReport('weekly', { start: weeklyStart, end: weeklyEnd })}>
              Generate Report
            </Button>
          </Box>
        </Box>
      )}

      {/* Monthly Report Tab */}
      {activeTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
            <TextField
              type="number"
              label="Year"
              value={monthlyYear}
              onChange={(e) => setMonthlyYear(e.target.value)}
              size="small"
              sx={{ width: 120 }}
            />
            <TextField
              type="number"
              label="Month"
              value={monthlyMonth}
              onChange={(e) => setMonthlyMonth(e.target.value)}
              size="small"
              sx={{ width: 120 }}
              inputProps={{ min: 1, max: 12 }}
            />
            <Button variant="contained" onClick={() => fetchReport('monthly', { year: monthlyYear, month: monthlyMonth })}>
              Generate Report
            </Button>
          </Box>
        </Box>
      )}

      {/* Unreplenished Aging Tab */}
      {activeTab === 3 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Button variant="contained" onClick={() => fetchReport('unreplenished-aging')}>
              Generate Aging Report
            </Button>
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Report Content */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {/* Daily Report Content */}
      {reportData && activeTab === 0 && (
        <Box className="print-section">
          <Typography variant="h6" sx={{ mb: 2 }}>
            Daily PCF Report - {formatDate(reportData.date)}
          </Typography>
          
          <TableContainer sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>PCF Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Beginning</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Disbursements</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Replenishments</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Unreplenished</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ending</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.pufs && reportData.pufs.map((pcf) => (
                  <TableRow key={pcf.pcf_id}>
                    <TableCell>{pcf.pcf_name}</TableCell>
                    <TableCell>{pcf.location_display}</TableCell>
                    <TableCell align="right">{formatPeso(pcf.beginning)}</TableCell>
                    <TableCell align="right">{formatPeso(pcf.disbursements)}</TableCell>
                    <TableCell align="right">{formatPeso(pcf.replenishments)}</TableCell>
                    <TableCell align="right" sx={{ color: pcf.unreplenished > 0 ? '#ed6c02' : 'inherit' }}>
                      {formatPeso(pcf.unreplenished)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatPeso(pcf.ending)}</TableCell>
                  </TableRow>
                ))}
                {reportData.totals && (
                  <TableRow sx={{ backgroundColor: '#0D47A1' }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 900, color: '#FFD54A', fontSize: '1rem', letterSpacing: '0.5px' }}>GRAND TOTAL</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'white' }}>{formatPeso(reportData.totals.beginning)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'white' }}>{formatPeso(reportData.totals.disbursements)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'white' }}>{formatPeso(reportData.totals.replenishments)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'white' }}>{formatPeso(reportData.totals.unreplenished)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, color: '#FFD54A', fontSize: '1.1rem', bgcolor: 'rgba(255,213,74,0.2)' }}>{formatPeso(reportData.totals.ending)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Weekly/Monthly Report Content */}
      {(reportData && (activeTab === 1 || activeTab === 2)) && (
        <Box className="print-section">
          <Typography variant="h6" sx={{ mb: 2 }}>
            {reportData.report_type === 'weekly' ? 'Weekly' : 'Monthly'} PCF Report
            {reportData.start_date && ` - ${formatDate(reportData.start_date)} to ${formatDate(reportData.end_date)}`}
            {reportData.month_name && ` - ${reportData.month_name} ${reportData.year}`}
          </Typography>
          
          <TableContainer sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>PCF Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Disbursements</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Replenishments</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Unreplenished</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.pufs?.map((pcf) => (
                  <TableRow key={pcf.pcf_id}>
                    <TableCell>{pcf.pcf_name}</TableCell>
                    <TableCell>{pcf.location_display}</TableCell>
                    <TableCell align="right">{formatPeso(pcf.disbursements)}</TableCell>
                    <TableCell align="right">{formatPeso(pcf.replenishments)}</TableCell>
                    <TableCell align="right" sx={{ color: pcf.unreplenished > 0 ? '#ed6c02' : 'inherit' }}>
                      {formatPeso(pcf.unreplenished)}
                    </TableCell>
                  </TableRow>
                ))}
                {reportData.totals && (
                  <TableRow sx={{ backgroundColor: '#0D47A1' }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 900, color: '#FFD54A', fontSize: '1rem', letterSpacing: '0.5px' }}>GRAND TOTAL</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'white' }}>{formatPeso(reportData.totals.disbursements)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'white' }}>{formatPeso(reportData.totals.replenishments)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: reportData.totals.unreplenished > 0 ? '#FF7043' : 'white' }}>{formatPeso(reportData.totals.unreplenished)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Unreplenished Aging Content */}
      {reportData && activeTab === 3 && (
        <Box className="print-section">
          <Typography variant="h6" sx={{ mb: 2 }}>
            Unreplenished Funds Aging Report - As of {formatDate(reportData.as_of_date)}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 'bold' }}>
            Total Outstanding: {formatPeso(reportData.total_outstanding)}
          </Typography>
          
          <Grid container spacing={2}>
            {Object.entries(reportData.aging_buckets).map(([key, bucket]) => (
              <Grid item xs={12} md={6} key={key}>
                <Box sx={{ 
                  border: '1px solid', 
                  borderColor: key === '61_plus_days' ? 'error.main' : key === '31-60_days' ? 'warning.main' : 'divider',
                  borderRadius: 1, 
                  p: 2,
                  bgcolor: key === '61_plus_days' ? 'error.light' : key === '31-60_days' ? 'warning.light' : 'background.paper'
                }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {bucket.label}
                    <Chip label={bucket.count} size="small" sx={{ ml: 1 }} />
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatPeso(bucket.total)}
                  </Typography>
                  
                  {bucket.transactions.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      {bucket.transactions.slice(0, 5).map((txn) => (
                        <Box key={txn.id} sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="body2">
                            {txn.pcf_name} ({txn.location_display})
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(txn.date)} - {txn.days_outstanding} days
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" sx={{ textAlign: 'right' }}>
                            {formatPeso(txn.amount)}
                          </Typography>
                        </Box>
                      ))}
                      {bucket.transactions.length > 5 && (
                        <Typography variant="caption" color="text.secondary">
                          +{bucket.transactions.length - 5} more...
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Paper>
  );
};

export default PcfReports;
