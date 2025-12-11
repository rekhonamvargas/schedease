import React, { useState, useMemo } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  CardActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import Header from "./Header";
import Sidebar from "./Sidebar";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EventIcon from "@mui/icons-material/Event";
import CloseIcon from "@mui/icons-material/Close";
import useSchedules from "../hooks/useSchedules";
import useSubjects from "../hooks/useSubjects";
import { parseScheduleString } from "../utils/parse";

/**
 * Renamed component: SavedTimetables
 * Renamed local variables and helper functions to alternative names
 * Behavior and logic are identical to original file.
 */
export default function SavedTimetables() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { schedules: plans, deleteSchedule: removePlan } = useSchedules([]);
  const { subjects: courses } = useSubjects([]);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [activePlan, setActivePlan] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [planPendingDelete, setPlanPendingDelete] = useState(null);

  // lookup map from course.data_id -> course object
  const coursesMap = useMemo(() => {
    const m = new Map();
    courses.forEach((course) => {
      if (course.data_id) m.set(String(course.data_id), course);
    });
    return m;
  }, [courses]);

  const openView = (plan) => {
    setActivePlan(plan);
    setIsViewOpen(true);
  };

  const openDeleteConfirm = (planId) => {
    setPlanPendingDelete(planId);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (planPendingDelete) {
      removePlan(planPendingDelete);
      closeDeleteConfirm();
    }
  };

  const closeDeleteConfirm = () => {
    setIsDeleteOpen(false);
    setPlanPendingDelete(null);
  };

  const closeView = () => {
    setIsViewOpen(false);
    setActivePlan(null);
  };

  // get course objects for a saved plan
  const getPlanCourses = (plan) => {
    if (!plan || !plan.subjects) return [];
    return plan.subjects
      .map((id) => coursesMap.get(String(id)))
      .filter(Boolean);
  };

  // time slot generator (30-min slots 07:00 -> 21:30)
  const buildTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time24 = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        let hour12 = hour;
        let period = "AM";
        if (hour === 0) hour12 = 12;
        else if (hour === 12) period = "PM";
        else if (hour > 12) {
          hour12 = hour - 12;
          period = "PM";
        }
        const time12 = `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
        slots.push({ time24, time12 });
      }
    }
    return slots;
  };

  const DAY_INDEX_MAP = {
    M: { name: "Monday", idx: 0 },
    T: { name: "Tuesday", idx: 1 },
    W: { name: "Wednesday", idx: 2 },
    TH: { name: "Thursday", idx: 3 },
    F: { name: "Friday", idx: 4 },
    S: { name: "Saturday", idx: 5 },
    SU: { name: "Sunday", idx: 6 },
  };

  const normalizeDayName = (d) => {
    const x = d.toUpperCase().trim();
    if (x === "TH" || x === "THU" || x === "THURS") return "TH";
    if (x === "SU" || x === "SUN" || x === "SUNDAY") return "SU";
    if (x === "M" || x === "MON" || x === "MONDAY") return "M";
    if (x === "T" || x === "TUE" || x === "TUES" || x === "TUESDAY") return "T";
    if (x === "W" || x === "WED" || x === "WEDNESDAY") return "W";
    if (x === "F" || x === "FRI" || x === "FRIDAY") return "F";
    if (x === "S" || x === "SAT" || x === "SATURDAY") return "S";
    return null;
  };

  const to24Hour = (t) => {
    if (!t) return null;
    const m = String(t).trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*([AP])M$/);
    if (!m) {
      const m24 = String(t).trim().match(/^(\d{1,2}):(\d{2})$/);
      if (m24) return `${String(parseInt(m24[1], 10)).padStart(2, "0")}:${m24[2]}`;
      return null;
    }
    let [, hh, mm, ap] = m;
    let h = parseInt(hh, 10);
    if (ap === "P" && h !== 12) h += 12;
    if (ap === "A" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${mm}`;
  };

  // parse a course.schedule string into [{ day, start, end, room }, ...]
  const parseCourseSchedule = (scheduleString) => {
    if (!scheduleString) return [];
    const parts = scheduleString.split(" / ").map((s) => s.trim()).filter(Boolean);
    const out = [];

    for (const part of parts) {
      const parsed = parseScheduleString(part);
      if (parsed) {
        out.push(parsed);
      } else {
        const multi = part.match(/^([A-Z\s]+)\s+(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)\s*(.*)$/i);
        if (multi) {
          const [, daysStr, start12, end12, tail] = multi;
          const days = daysStr.trim().split(/\s+/).filter(Boolean);
          const room = tail?.trim() || "";
          const start24 = to24Hour(start12);
          const end24 = to24Hour(end12);

          if (start24 && end24) {
            for (const d of days) {
              const nd = normalizeDayName(d);
              if (nd) {
                out.push({
                  day: nd,
                  start: start24,
                  end: end24,
                  room,
                });
              }
            }
          }
        }
      }
    }

    return out;
  };

  const slotWithinRange = (time24, start24, end24) => {
    if (!time24 || !start24 || !end24) return false;
    const [tH, tM] = time24.split(":").map(Number);
    const [sH, sM] = start24.split(":").map(Number);
    const [eH, eM] = end24.split(":").map(Number);
    if ([tH, tM, sH, sM, eH, eM].some((v) => Number.isNaN(v))) return false;
    const tMin = tH * 60 + tM;
    const sMin = sH * 60 + sM;
    const eMin = eH * 60 + eM;
    return tMin >= sMin && tMin < eMin;
  };

  const computeRowSpan = (start24, end24) => {
    if (!start24 || !end24) return 1;
    const [sH, sM] = start24.split(":").map(Number);
    const [eH, eM] = end24.split(":").map(Number);
    if ([sH, sM, eH, eM].some((v) => Number.isNaN(v))) return 1;
    const sMin = sH * 60 + sM;
    const eMin = eH * 60 + eM;
    const duration = eMin - sMin;
    return Math.max(1, Math.ceil(duration / 30));
  };

  // build grid mapping for active plan
  const buildTimetableGrid = (plan) => {
    const timeSlots = buildTimeSlots();
    const planCourses = getPlanCourses(plan);
    const grid = new Map();

    planCourses.forEach((course) => {
      if (!course.schedule) return;
      const parsedList = parseCourseSchedule(course.schedule);
      parsedList.forEach((p) => {
        const dayIdx = DAY_INDEX_MAP[p.day]?.idx;
        if (dayIdx === undefined) return;
        timeSlots.forEach((slot, si) => {
          if (slotWithinRange(slot.time24, p.start, p.end)) {
            const key = `${dayIdx}_${slot.time24}`;
            if (!grid.has(key)) {
              grid.set(key, {
                course,
                parsed: p,
                startSlot: si,
                rowSpan: computeRowSpan(p.start, p.end),
              });
            }
          }
        });
      });
    });

    return { grid, timeSlots };
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fff6db" }}>
      <Header onMenu={() => setIsSidebarOpen(true)} cartCount={plans.length} />
      <Sidebar open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onNavigate={() => setIsSidebarOpen(false)} />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#9e0807", fontFamily: "'Poppins', sans-serif", mb: 1 }}>
            Saved Schedules
          </Typography>
          <Typography variant="body1" sx={{ color: "#666", fontFamily: "'Poppins', sans-serif" }}>
            View and manage all your saved schedules
          </Typography>
        </Box>

        {plans.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: "center", bgcolor: "#fffef7", borderRadius: 3, boxShadow: "0 2px 12px rgba(158, 8, 7, 0.08)", border: "1px solid rgba(244, 197, 34, 0.15)" }}>
            <CalendarTodayIcon sx={{ fontSize: 64, color: "#f4c522", mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ color: "#666", fontFamily: "'Poppins', sans-serif", mb: 1 }}>
              No Saved Schedules Yet
            </Typography>
            <Typography variant="body2" sx={{ color: "#999", fontFamily: "'Poppins', sans-serif" }}>
              Create and save schedules from the dashboard to see them here
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {plans.map((plan) => {
              const planCourses = getPlanCourses(plan);
              const createdLabel = plan.created_at
                ? new Date(plan.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                : "Unknown date";

              return (
                <Grid item xs={12} sm={6} md={4} key={plan.schedule_id}>
                  <Card sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "#fffef7", borderRadius: 3, boxShadow: "0 2px 12px rgba(158, 8, 7, 0.08)", border: "1px solid rgba(244, 197, 34, 0.15)", transition: "all 0.3s ease", "&:hover": { boxShadow: "0 4px 20px rgba(158, 8, 7, 0.15)", transform: "translateY(-4px)" } }}>
                    <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                        <EventIcon sx={{ color: "#f4c522", mr: 1.5, fontSize: 28 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "#9e0807", fontFamily: "'Poppins', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {plan.schedule_name || "Untitled Schedule"}
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Chip label={`${planCourses.length} Subject${planCourses.length !== 1 ? "s" : ""}`} size="small" sx={{ bgcolor: "rgba(244, 197, 34, 0.2)", color: "#9e0807", fontWeight: 600, borderRadius: "16px", mr: 1, mb: 1 }} />
                        <Chip label={createdLabel} size="small" sx={{ bgcolor: "rgba(158, 8, 7, 0.1)", color: "#666", fontWeight: 500, borderRadius: "16px" }} />
                      </Box>
                    </CardContent>

                    <CardActions sx={{ p: 2, pt: 0, display: "flex", justifyContent: "space-between" }}>
                      <Button size="small" variant="contained" startIcon={<VisibilityIcon />} onClick={() => openView(plan)} sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#9e0807", color: "#fff", borderRadius: "20px", px: 2.5, "&:hover": { bgcolor: "#7a0606" } }}>
                        View Details
                      </Button>
                      <IconButton size="small" onClick={() => openDeleteConfirm(plan.schedule_id)} sx={{ color: "#f44336", "&:hover": { bgcolor: "rgba(244, 67, 54, 0.1)" } }}>
                        <DeleteIcon />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* View Dialog */}
        <Dialog open={isViewOpen} onClose={closeView} maxWidth="xl" fullWidth PaperProps={{ sx: { borderRadius: 3, bgcolor: "#fffef7", maxHeight: "90vh" } }}>
          <DialogTitle sx={{ fontWeight: 700, color: "#9e0807", fontFamily: "'Poppins', sans-serif", borderBottom: "1px solid rgba(244, 197, 34, 0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <EventIcon sx={{ color: "#f4c522" }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}>
                  {activePlan?.schedule_name || "Schedule Details"}
                </Typography>
                {activePlan?.created_at && <Typography variant="caption" sx={{ color: "#666" }}>Created: {new Date(activePlan.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</Typography>}
              </Box>
            </Box>
            <IconButton onClick={closeView} sx={{ color: "#9e0807" }}><CloseIcon /></IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 3 }}>
            {activePlan && (() => {
              const { grid, timeSlots } = buildTimetableGrid(activePlan);
              return (
                <TableContainer sx={{ maxHeight: "calc(90vh - 200px)", overflow: "auto" }}>
                  <Table stickyHeader size="small" sx={{ minWidth: 650, tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0, "& .MuiTableCell-root": { borderRight: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", "&:last-child": { borderRight: "none" } } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell align="center" sx={{ backgroundColor: "#9e0807", color: "#ffffff", fontWeight: 700, borderRight: "1px solid #7a0606", position: "sticky", left: 0, zIndex: 3, width: "70px", minWidth: "70px", maxWidth: "70px", padding: "8px 4px" }}>
                          Time
                        </TableCell>
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                          <TableCell key={d} align="center" sx={{ backgroundColor: "#9e0807", color: "#ffffff", fontWeight: 700, border: "1px solid #7a0606", width: "calc((100% - 70px) / 7)" }}>
                            {d}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {timeSlots.map((slot, rowIndex) => {
                        const coveredDays = new Set();
                        for (let p = 0; p < rowIndex; p++) {
                          [0, 1, 2, 3, 4, 5, 6].forEach((dayIdx) => {
                            const prevKey = `${dayIdx}_${timeSlots[p].time24}`;
                            const prevCell = grid.get(prevKey);
                            if (prevCell && prevCell.startSlot === p) {
                              const endRow = prevCell.startSlot + prevCell.rowSpan - 1;
                              if (rowIndex <= endRow && rowIndex > p) {
                                coveredDays.add(dayIdx);
                              }
                            }
                          });
                        }

                        return (
                          <TableRow key={slot.time24}>
                            <TableCell align="center" sx={{ backgroundColor: "#fafafa", fontWeight: 600, borderRight: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", position: "sticky", left: 0, zIndex: 2, whiteSpace: "nowrap", width: "70px", minWidth: "70px", maxWidth: "70px", padding: "8px 4px" }}>
                              {slot.time12}
                            </TableCell>

                            {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                              if (coveredDays.has(dayIdx)) return null;
                              const key = `${dayIdx}_${slot.time24}`;
                              const cell = grid.get(key);

                              if (cell && cell.startSlot === rowIndex) {
                                const { course, parsed, rowSpan } = cell;
                                return (
                                  <TableCell key={dayIdx} rowSpan={rowSpan} sx={{ backgroundColor: "#f4c522", borderRight: "1px solid #d29119", borderBottom: "1px solid #d29119", p: 1, verticalAlign: "middle", textAlign: "center", width: "calc((100% - 70px) / 7)" }}>
                                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100%" }}>
                                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#333333", mb: 0.5 }}>
                                        {course.subject_code}
                                        {course.section && <Chip label={course.section} size="small" sx={{ ml: 0.5, height: 18, fontSize: "0.7rem", backgroundColor: "rgba(158, 8, 7, 0.15)", color: "#9e0807", border: "1px solid rgba(158, 8, 7, 0.3)" }} />}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: "#333333", display: "block" }}>{parsed.start} - {parsed.end}</Typography>
                                      {parsed.room && <Typography variant="caption" sx={{ color: "#333333", display: "block" }}>Room: {parsed.room}</Typography>}
                                    </Box>
                                  </TableCell>
                                );
                              }

                              return <TableCell key={dayIdx} sx={{ borderRight: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", minHeight: 40, width: "calc((100% - 70px) / 7)", backgroundColor: "#ffffff" }} />;
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={isDeleteOpen} onClose={closeDeleteConfirm} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, bgcolor: "#fffef7" } }}>
          <DialogTitle sx={{ fontWeight: 700, color: "#9e0807", fontFamily: "'Poppins', sans-serif", borderBottom: "1px solid rgba(244, 197, 34, 0.2)" }}>
            Delete Schedule?
          </DialogTitle>
          <DialogContent sx={{ p: 3, pt: 3 }}>
            <Typography sx={{ fontFamily: "'Poppins', sans-serif", color: "#666" }}>Are you sure you want to delete this schedule?</Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={closeDeleteConfirm} sx={{ color: "#666", fontWeight: 600, textTransform: "none", fontFamily: "'Poppins', sans-serif" }}>Cancel</Button>
            <Button onClick={confirmDelete} variant="contained" sx={{ bgcolor: "#d32f2f", color: "#fff", fontWeight: 600, textTransform: "none", borderRadius: "20px", fontFamily: "'Poppins', sans-serif", "&:hover": { bgcolor: "#b71c1c" } }}>Delete</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
