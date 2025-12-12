import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Box, Snackbar, Alert, Paper, Button, Stack, Typography } from "@mui/material";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ImportData from "./ImportData";
import Schedule from "./Schedule";
import SubjectList from "./SubjectList";
import DataForm from "./DataForm";
import useSubjects from "../hooks/useSubjects";
import useSchedules from "../hooks/useSchedules";
import useFilters from "../hooks/useFilters";
import { userKey } from "../utils/storage";
import SetFilter from "./SetFilter";
import "../App.css";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import ListAltIcon from "@mui/icons-material/ListAlt";


const COLORS = { bg: "#fff6db", paper: "#fffef7", primary: "#9e0807", gold: "#f4c522" };

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeLeft, setActiveLeft] = useState(null);

  const { subjects: dataList, addMany: handleAddMany, save: handleSaveEdited, remove: handleDeleteData } = useSubjects([]);
  const { schedules: scheduleList, saveSchedule: handleSaveSchedule, deleteSchedule: handleDeleteSchedule, removeSubjectFromSchedules } = useSchedules([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { breakBetweenMinutes, excludeDays, toggleExcludeDay, classTypes, toggleClassType, filterSubjects } = useFilters({});

  const handleEditOpen = useCallback((item) => { setEditing(item); setEditOpen(true); }, []);
  const handleSaveEditedWrapper = useCallback((item) => {
    const result = handleSaveEdited(item);
    if (result && !result.success) { setSnackMsg(result.error || "Failed to save subject"); setSnackSeverity("error"); setSnackOpen(true); return; }
    setEditOpen(false); setEditing(null);
  }, [handleSaveEdited]);

  const handleDeleteDataWrapper = useCallback((id) => {
    handleDeleteData(id); removeSubjectFromSchedules(id);
    setAddedSubjectIds((prev) => { const next = new Set(prev); next.delete(String(id)); return next; });
  }, [handleDeleteData, removeSubjectFromSchedules]);

  const openSubjects = useMemo(() => (dataList || []).filter((d) => !d.is_closed), [dataList]);
  const ADDED_KEY = userKey("schedease_added_subjects");
  const [addedSubjectIds, setAddedSubjectIds] = useState(() => {
    try { const stored = localStorage.getItem(ADDED_KEY); if (stored) return new Set(JSON.parse(stored)); } catch {}
    return new Set();
  });
  // Persist addedSubjectIds to localStorage
  useEffect(() => { try { localStorage.setItem(ADDED_KEY, JSON.stringify(Array.from(addedSubjectIds))); } catch {} }, [addedSubjectIds, ADDED_KEY]);

  // Defensive sync: Remove any IDs from addedSubjectIds that are not present in dataList
  useEffect(() => {
    const validIds = new Set((dataList || []).map((d) => String(d.data_id ?? `${d.subject_code}-${d.section || ""}`)));
    setAddedSubjectIds((prev) => {
      const filtered = new Set([...prev].filter((id) => validIds.has(id)));
      return filtered.size === prev.size ? prev : filtered;
    });
  }, [dataList]);

  const handleSubjectAdd = useCallback((item, isAdded) => {
    const id = String(item.data_id ?? `${item.subject_code}-${item.section || ""}`);
    const itemSubjectCode = (item.subject_code || "").trim().toUpperCase();
    setAddedSubjectIds((prev) => {
      const next = new Set(prev);
      if (isAdded) {
        const alreadyAddedSameCode = dataList.some((subject) => {
          const subjectId = String(subject.data_id ?? `${subject.subject_code}-${subject.section || ""}`);
          const subjectCode = (subject.subject_code || "").trim().toUpperCase();
          return prev.has(subjectId) && subjectCode === itemSubjectCode && subjectId !== id;
        });
        if (alreadyAddedSameCode) { setSnackMsg(`Cannot add duplicate subject: A subject with code ${itemSubjectCode} is already in the schedule`); setSnackSeverity("error"); setSnackOpen(true); return prev; }
        next.add(id);
      } else next.delete(id);
      return next;
    });
  }, [dataList]);

  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");
  const [snackSeverity, setSnackSeverity] = useState("success");

  const handleImportParsed = useCallback((parsedArray = []) => {
    const filtered = filterSubjects(parsedArray || []);
    if ((filtered || []).length > 0) { handleAddMany(filtered); setSnackMsg(`Successfully added ${filtered.length} subject(s).`); setSnackSeverity("success"); setSnackOpen(true); }
    else { setSnackMsg("No subjects matched the active filters. Adjust filters or clear them and try again."); setSnackSeverity("warning"); setSnackOpen(true); }
  }, [filterSubjects, handleAddMany]);

  const handleClearAll = useCallback(() => {
    if (!Array.isArray(dataList) || dataList.length === 0) { setSnackMsg("No subjects to delete"); setSnackSeverity("info"); setSnackOpen(true); return; }
    for (const d of dataList) { const id = d.data_id ?? null; if (id != null) { handleDeleteData(id); removeSubjectFromSchedules(id); } }
    setAddedSubjectIds(new Set()); setSnackMsg(`Deleted ${dataList.length} subject(s)`); setSnackSeverity("success"); setSnackOpen(true);
  }, [dataList, handleDeleteData, removeSubjectFromSchedules]);

  // Handle navigation from SetFilter to Import Data
  const handleNavigateToImport = useCallback(() => {
    setActiveLeft("import");
  }, []);

  /* ---------- LEFT PANEL CONTENT ---------- */
  const leftPanelContent = () => {
    if (activeLeft === "filter") return (
      <SetFilter 
        excludeDays={excludeDays} 
        toggleExcludeDay={toggleExcludeDay} 
        classTypes={classTypes} 
        toggleClassType={toggleClassType}
        onNavigateToImport={handleNavigateToImport} 
      />
    );
    if (activeLeft === "import") return (
      <ImportData 
        onCreateMany={handleImportParsed} 
        onNavigateToSubjects={() => setActiveLeft("subjects")} 
      />
    );
    if (activeLeft === "subjects")
      return (
        <SubjectList
          onNavigateToImport={() => setActiveLeft("import")}
          dataList={dataList}
          onEdit={handleEditOpen}
          onDelete={handleDeleteDataWrapper}
          onAdd={handleSubjectAdd}
          addedIds={Array.from(addedSubjectIds)}
          onClear={handleClearAll}
          totalImported={dataList.length}
          filtersActive={Boolean(breakBetweenMinutes || excludeDays?.length || classTypes?.length)}
          hideCardContainer={Boolean(activeLeft)} // when any module is active, SubjectList will render flat (no background card container)
        />
      );
    return null;
  };

  /* ----------SIDE MENU ---------- */
  const sideMenu = (
    <Box sx={{ 
      height: "100%", 
      display: "flex", 
      flexDirection: "column",
      p: 3,
      background: `linear-gradient(180deg, ${COLORS.gold}15 0%, ${COLORS.primary}05 100%)`,
    }}>
      {/* Logo and Title Section */}
      <Box sx={{ 
        textAlign: "center", 
        mb: 4,
        pt: 2,
      }}>
        <Box
          component="img"
          src="/favicon.ico"
          alt="SchedEase Logo"
          sx={{
            width: 80,
            height: 80,
            bgcolor: COLORS.primary,
            mx: "auto",
            mb: 2,
            borderRadius: "50%",
            objectFit: "cover",
            boxShadow: "0 4px 20px rgba(158, 8, 7, 0.3)",
            border: `3px solid ${COLORS.gold}`,
          }}
        />
        
        
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 900, 
            color: COLORS.primary,
            mb: 0.5,
            letterSpacing: "0.5px",
          }}
        >
          SchedEase
        </Typography>
        
        <Typography 
          variant="caption" 
          sx={{ 
            color: COLORS.primary,
            opacity: 0.7,
            fontWeight: 500,
            fontSize: "0.8rem",
            letterSpacing: "0.3px",
          }}
        >
          CIT Schedule Builder
        </Typography>
      </Box>

      {/* Instructions Section */}
      <Box sx={{ 
        mb: 4,
        p: 2.5,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        borderRadius: 3,
        border: "1px solid rgba(244, 197, 34, 0.2)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 700, 
            color: COLORS.primary,
            mb: 1.5,
            fontSize: "1.3rem",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          📋 Build Your Schedule
        </Typography>
        
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <Box sx={{ 
              minWidth: 24,
              height: 24,
              borderRadius: "50%",
              bgcolor: COLORS.primary,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 700,
              mt: 0.25,
            }}>
              1
            </Box>
            <Typography variant="body2" sx={{ color: "#555", lineHeight: 1.4, fontSize: "1rem" }}>
              <strong>Set Filters</strong> – Exclude days & choose class types
            </Typography>
          </Box>
          
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <Box sx={{ 
              minWidth: 24,
              height: 24,
              borderRadius: "50%",
              bgcolor: COLORS.primary,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 700,
              mt: 0.25,
            }}>
              2
            </Box>
            <Typography variant="body2" sx={{ color: "#555", lineHeight: 1.4, fontSize: "1rem" }}>
              <strong>Import Data</strong> – Paste subject data from CIT AIMS to add subjects
            </Typography>
          </Box>
          
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <Box sx={{ 
              minWidth: 24,
              height: 24,
              borderRadius: "50%",
              bgcolor: COLORS.primary,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 700,
              mt: 0.25,
            }}>
              3
            </Box>
            <Typography variant="body2" sx={{ color: "#555", lineHeight: 1.4, fontSize: "1rem" }}>
              <strong>Add to Schedule</strong> – Review subjects & add to schedule
            </Typography>
          </Box>
        </Stack>
        
        <Typography 
          variant="caption" 
          sx={{ 
            color: COLORS.gold,
            fontWeight: 600,
            fontSize: "0.95rem",
            fontStyle: "italic",
            display: "block",
            textAlign: "center",
            pt: 1,
            borderTop: "1px dashed rgba(244, 197, 34, 0.3)",
          }}
        >
          Follow these steps for the perfect schedule!
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Stack spacing={2} sx={{ flex: 1, justifyContent: "center" }}>
        <Button
          fullWidth
          variant={activeLeft === "filter" ? "contained" : "outlined"}
          onClick={() => setActiveLeft("filter")}
          startIcon={<FilterAltIcon />}
          sx={{
            py: 2.2,
            fontWeight: 700,
            fontSize: "1rem",
            borderRadius: 2.5,
            textTransform: "none",
            bgcolor: activeLeft === "filter" ? COLORS.primary : "transparent",
            color: activeLeft === "filter" ? "#fff" : COLORS.primary,
            border: `2px solid ${COLORS.primary}`,
            "&:hover": { 
              bgcolor: activeLeft === "filter" ? "#7a0506" : COLORS.primary,
              color: "#fff",
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(158, 8, 7, 0.2)",
            },
            transition: "all 0.2s ease",
          }}
        >
          Set Filter
        </Button>

        <Button
          fullWidth
          variant={activeLeft === "import" ? "contained" : "outlined"}
          onClick={() => setActiveLeft("import")}
          startIcon={<FileUploadIcon />}
          sx={{
            py: 2.2,
            fontWeight: 700,
            fontSize: "1rem",
            borderRadius: 2.5,
            textTransform: "none",
            bgcolor: activeLeft === "import" ? COLORS.primary : "transparent",
            color: activeLeft === "import" ? "#fff" : COLORS.primary,
            border: `2px solid ${COLORS.primary}`,
            "&:hover": { 
              bgcolor: activeLeft === "import" ? "#7a0506" : COLORS.primary,
              color: "#fff",
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(158, 8, 7, 0.2)",
            },
            transition: "all 0.2s ease",
          }}
        >
          Import Data
        </Button>

        <Button
          fullWidth
          variant={activeLeft === "subjects" ? "contained" : "outlined"}
          onClick={() => setActiveLeft("subjects")}
          startIcon={<ListAltIcon />}
          sx={{
            py: 2.2,
            fontWeight: 700,
            fontSize: "1rem",
            borderRadius: 2.5,
            textTransform: "none",
            bgcolor: activeLeft === "subjects" ? COLORS.primary : "transparent",
            color: activeLeft === "subjects" ? "#fff" : COLORS.primary,
            border: `2px solid ${COLORS.primary}`,
            "&:hover": { 
              bgcolor: activeLeft === "subjects" ? "#7a0506" : COLORS.primary,
              color: "#fff",
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(158, 8, 7, 0.2)",
            },
            transition: "all 0.2s ease",
          }}
        >
          Subject List
        </Button>
      </Stack>

      {/* Stats Footer */}
      <Box sx={{ 
        mt: "auto", 
        pt: 3,
        borderTop: "1px solid rgba(0,0,0,0.08)",
        textAlign: "center",
      }}>
        <Typography 
          variant="caption" 
          sx={{ 
            color: COLORS.primary,
            opacity: 0.7,
            fontWeight: 500,
            fontSize: "0.95rem",
          }}
        >
          {dataList.length > 0 ? (
            <>📚 <strong>{dataList.length}</strong> subject{dataList.length !== 1 ? 's' : ''} imported</>
          ) : (
            "No subjects imported yet"
          )}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box className="App" sx={{
      minHeight: "100vh",
      height: "100vh",
      maxHeight: "100vh",
      bgcolor: COLORS.bg,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column"
    }}>
      <Header onMenu={() => setSidebarOpen(true)} cartCount={scheduleList.length} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onNavigate={() => setSidebarOpen(false)} />

      <Box sx={{
        flex: 1,
        px: 2,
        py: 2,
        height: "calc(100vh - 64px)",
        display: "flex",
        gap: 2,
        overflow: "hidden" // outer shouldn't scroll; inner schedule handles its own scroll
      }}>
        {/* LEFT COLUMN */}
        {activeLeft ? (
          // FLAT, borderless, full-height module (user wanted borderless when opened)
          <Box sx={{
            width: "35%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            // no Paper / no background container — flat UI
          }}>
            
            <Box sx={{ 
              px: 2, 
              py: 2, 
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              backgroundColor: COLORS.paper,
              padding: 1.5,
              borderRadius: 20,
              border: `1px solid rgba(158, 8, 7, 0.2)`,
              marginBottom: 1,
              justifyContent: "space-between"
            }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Button
                  variant="contained"
                  onClick={() => setActiveLeft(null)}
                  startIcon={<ArrowBackIosNewIcon sx={{ fontSize: "0.9rem" }} />}
                  sx={{
                    backgroundColor: COLORS.primary,
                    color: "#ffffff",
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    borderRadius: 2.5,
                    px: 2.5,
                    py: 1,
                    minWidth: "auto",
                    boxShadow: "0 2px 6px rgba(158, 8, 7, 0.2)",
                    "&:hover": {
                      backgroundColor: "#7a0506",
                      boxShadow: "0 4px 12px rgba(158, 8, 7, 0.3)",
                      transform: "translateY(-1px)",
                    },
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  Back to Menu
                </Button>
              </Box>
              
              {/* Quick Stats (optional) */}
              {activeLeft === "subjects" && dataList.length > 0 && (
                <Box sx={{ 
                  px: 1.5,
                  py: 0.5,
                  backgroundColor: "rgba(244, 197, 34, 0.1)",
                  borderRadius: 1.5,
                  border: "1px solid rgba(244, 197, 34, 0.3)",
                }}>
                  <Typography 
                    sx={{ 
                      color: "#9e0807",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                    }}
                  >
                    {dataList.length} subject{dataList.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* module content should fill remaining height; we enforce flex:1 */}
            <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {/* leftPanelContent components (ImportData / SetFilter / SubjectList) should themselves take full height */}
              {leftPanelContent()}
            </Box>
          </Box>
        ) : (
          // Default side menu inside a nice Paper card
          <Paper sx={{
            width: "35%",
            height: "100%",
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid rgba(244, 197, 34, 0.2)",
          }}>
            {sideMenu}
          </Paper>
        )}

        {/* RIGHT COLUMN — schedule area. Schedule will manage its own internal scrolling */}
        <Paper sx={{
          flex: 1,
          height: "100%",
          borderRadius: 3,
          boxShadow: 3,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}>
          <Box sx={{ flex: 1, height: "100%" }}>
            <Schedule
              dataList={openSubjects}
              schedules={scheduleList}
              onSaveSchedule={handleSaveSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              addedSubjectIds={Array.from(addedSubjectIds)}
              onRemoveSubject={handleSubjectAdd}
            />
          </Box>
        </Paper>
      </Box>

      <DataForm open={editOpen} initial={editing} onClose={() => setEditOpen(false)} onSave={handleSaveEditedWrapper} existingSubjects={dataList} />
      <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert onClose={() => setSnackOpen(false)} severity={snackSeverity} variant="filled" sx={{ width: "100%", fontSize: "1.05rem", py: 1.5, px: 3, fontWeight: 700 }}>
          {snackMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}