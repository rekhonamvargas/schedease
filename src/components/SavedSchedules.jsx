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
  Stack,
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

export default function SavedSchedules() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { schedules, deleteSchedule } = useSchedules([]);
  const { subjects } = useSubjects([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);

  // Create a lookup map for subjects
  const subjectsMap = useMemo(() => {
    const map = new Map();
    subjects.forEach((subject) => {
      if (subject.data_id) {
        map.set(String(subject.data_id), subject);
      }
    });
    return map;
  }, [subjects]);

  const handleViewSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setViewDialogOpen(true);
  };

  const handleDeleteSchedule = (scheduleId) => {
    setScheduleToDelete(scheduleId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (scheduleToDelete) {
      deleteSchedule(scheduleToDelete);
      handleCloseDeleteDialog();
    }
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setScheduleToDelete(null);
  };

  const handleCloseDialog = () => {
    setViewDialogOpen(false);
    setSelectedSchedule(null);
  };

  // Get subjects for a schedule
  const getScheduleSubjects = (schedule) => {
    if (!schedule || !schedule.subjects) return [];
    return schedule.subjects
      .map((subjectId) => subjectsMap.get(String(subjectId)))
      .filter(Boolean);
  };

  // Helper functions for schedule grid (copied from Schedule.js)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time24 = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        let hour12 = hour;
        let period = "AM";
        if (hour === 0) {
          hour12 = 12;
        } else if (hour === 12) {
          hour12 = 12;
          period = "PM";
        } else if (hour > 12) {
          hour12 = hour - 12;
          period = "PM";
        }
        const time12 = `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
        slots.push({ time24, time12 });
      }
    }
    return slots;
  };

  const DAY_MAP = {
    M: { name: "Monday", index: 0 },
    T: { name: "Tuesday", index: 1 },
    W: { name: "Wednesday", index: 2 },
    TH: { name: "Thursday", index: 3 },
    F: { name: "Friday", index: 4 },
    S: { name: "Saturday", index: 5 },
    SU: { name: "Sunday", index: 6 },
  };

  const normalizeDay = (d) => {
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

  const convertTo24h = (t) => {
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

  const parseSubjectSchedule = (scheduleString) => {
    if (!scheduleString) return [];
    const scheduleParts = scheduleString.split(" / ").map(s => s.trim()).filter(Boolean);
    const parsedSchedules = [];

    for (const part of scheduleParts) {
      const parsed = parseScheduleString(part);
      if (parsed) {
        parsedSchedules.push(parsed);
      } else {
        const multiDayMatch = part.match(/^([A-Z\s]+)\s+(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)\s*(.*)$/i);
        if (multiDayMatch) {
          const [, daysStr, start12, end12, tail] = multiDayMatch;
          const days = daysStr.trim().split(/\s+/).filter(Boolean);
          const room = tail?.trim() || "";
          const start24 = convertTo24h(start12);
          const end24 = convertTo24h(end12);

          if (start24 && end24) {
            for (const day of days) {
              const normalizedDay = normalizeDay(day);
              if (normalizedDay) {
                parsedSchedules.push({
                  day: normalizedDay,
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
    return parsedSchedules;
  };

  const isTimeInRange = (time24, start24, end24) => {
    if (!time24 || !start24 || !end24) return false;
    const timeParts = time24.split(":").map(Number);
    const startParts = start24.split(":").map(Number);
    const endParts = end24.split(":").map(Number);

    if (timeParts.length !== 2 || startParts.length !== 2 || endParts.length !== 2) return false;

    const [timeH, timeM] = timeParts;
    const [startH, startM] = startParts;
    const [endH, endM] = endParts;

    if (isNaN(timeH) || isNaN(timeM) || isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return false;

    const timeMinutes = timeH * 60 + timeM;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  };

  const calculateRowSpan = (start24, end24) => {
    if (!start24 || !end24) return 1;
    const startParts = start24.split(":").map(Number);
    const endParts = end24.split(":").map(Number);
    if (startParts.length !== 2 || endParts.length !== 2) return 1;

    const [startH, startM] = startParts;
    const [endH, endM] = endParts;
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 1;

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const durationMinutes = endMinutes - startMinutes;

    return Math.max(1, Math.ceil(durationMinutes / 30));
  };

  // Generate schedule grid for selected schedule
  const generateScheduleGrid = (schedule) => {
    const timeSlots = generateTimeSlots();
    const scheduleSubjects = getScheduleSubjects(schedule);
    const grid = new Map();

    scheduleSubjects.forEach((subject) => {
      if (!subject.schedule) return;
      const parsedSchedules = parseSubjectSchedule(subject.schedule);

      parsedSchedules.forEach((parsed) => {
        const dayIndex = DAY_MAP[parsed.day]?.index;
        if (dayIndex === undefined) return;

        timeSlots.forEach((slot, slotIndex) => {
          if (isTimeInRange(slot.time24, parsed.start, parsed.end)) {
            const key = `${dayIndex}_${slot.time24}`;
            if (!grid.has(key)) {
              grid.set(key, {
                subject,
                parsed,
                startSlot: slotIndex,
                rowSpan: calculateRowSpan(parsed.start, parsed.end),
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
      <Header onMenu={() => setSidebarOpen(true)} cartCount={schedules.length} />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={() => setSidebarOpen(false)}
      />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#9e0807",
              fontFamily: "'Poppins', sans-serif",
              mb: 1,
            }}
          >
            Saved Schedules
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "#666",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            View and manage all your saved schedules
          </Typography>
        </Box>

        {schedules.length === 0 ? (
          <Paper
            sx={{
              p: 6,
              textAlign: "center",
              bgcolor: "#fffef7",
              borderRadius: 3,
              boxShadow: "0 2px 12px rgba(158, 8, 7, 0.08)",
              border: "1px solid rgba(244, 197, 34, 0.15)",
            }}
          >
            <CalendarTodayIcon
              sx={{
                fontSize: 64,
                color: "#f4c522",
                mb: 2,
                opacity: 0.5,
              }}
            />
            <Typography
              variant="h6"
              sx={{
                color: "#666",
                fontFamily: "'Poppins', sans-serif",
                mb: 1,
              }}
            >
              No Saved Schedules Yet
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#999",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              Create and save schedules from the dashboard to see them here
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {schedules.map((schedule) => {
              const scheduleSubjects = getScheduleSubjects(schedule);
              const createdDate = schedule.created_at
                ? new Date(schedule.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
                : "Unknown date";

              return (
                <Grid item xs={12} sm={6} md={4} key={schedule.schedule_id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      bgcolor: "#fffef7",
                      borderRadius: 3,
                      boxShadow: "0 2px 12px rgba(158, 8, 7, 0.08)",
                      border: "1px solid rgba(244, 197, 34, 0.15)",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        boxShadow: "0 4px 20px rgba(158, 8, 7, 0.15)",
                        transform: "translateY(-4px)",
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                        <EventIcon
                          sx={{
                            color: "#f4c522",
                            mr: 1.5,
                            fontSize: 28,
                          }}
                        />
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            color: "#9e0807",
                            fontFamily: "'Poppins', sans-serif",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {schedule.schedule_name || "Untitled Schedule"}
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Chip
                          label={`${scheduleSubjects.length} Subject${scheduleSubjects.length !== 1 ? "s" : ""}`}
                          size="small"
                          sx={{
                            bgcolor: "rgba(244, 197, 34, 0.2)",
                            color: "#9e0807",
                            fontWeight: 600,
                            borderRadius: "16px",
                            mr: 1,
                            mb: 1,
                          }}
                        />
                        <Chip
                          label={createdDate}
                          size="small"
                          sx={{
                            bgcolor: "rgba(158, 8, 7, 0.1)",
                            color: "#666",
                            fontWeight: 500,
                            borderRadius: "16px",
                          }}
                        />
                      </Box>


                    </CardContent>

                    <CardActions
                      sx={{
                        p: 2,
                        pt: 0,
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewSchedule(schedule)}
                        sx={{
                          textTransform: "none",
                          fontWeight: 600,
                          bgcolor: "#9e0807",
                          color: "#fff",
                          borderRadius: "20px",
                          px: 2.5,
                          "&:hover": {
                            bgcolor: "#7a0606",
                          },
                        }}
                      >
                        View Details
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteSchedule(schedule.schedule_id)}
                        sx={{
                          color: "#f44336",
                          "&:hover": {
                            bgcolor: "rgba(244, 67, 54, 0.1)",
                          },
                        }}
                      >
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
        <Dialog
          open={viewDialogOpen}
          onClose={handleCloseDialog}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              bgcolor: "#fffef7",
              maxHeight: "90vh",
            },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 700,
              color: "#9e0807",
              fontFamily: "'Poppins', sans-serif",
              borderBottom: "1px solid rgba(244, 197, 34, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <EventIcon sx={{ color: "#f4c522" }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}>
                  {selectedSchedule?.schedule_name || "Schedule Details"}
                </Typography>
                {selectedSchedule?.created_at && (
                  <Typography variant="caption" sx={{ color: "#666" }}>
                    Created: {new Date(selectedSchedule.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Typography>
                )}
              </Box>
            </Box>
            <IconButton onClick={handleCloseDialog} sx={{ color: "#9e0807" }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {selectedSchedule && (() => {
              const { grid, timeSlots } = generateScheduleGrid(selectedSchedule);
              return (
                <TableContainer sx={{ maxHeight: "calc(90vh - 200px)", overflow: "auto" }}>
                  <Table
                    stickyHeader
                    size="small"
                    sx={{
                      minWidth: 650,
                      tableLayout: "fixed",
                      borderCollapse: "separate",
                      borderSpacing: 0,
                      "& .MuiTableCell-root": {
                        borderRight: "1px solid #e0e0e0",
                        borderBottom: "1px solid #e0e0e0",
                        "&:last-child": {
                          borderRight: "none",
                        },
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell
                          align="center"
                          sx={{
                            backgroundColor: "#9e0807",
                            color: "#ffffff",
                            fontWeight: 700,
                            borderRight: "1px solid #7a0606",
                            position: "sticky",
                            left: 0,
                            zIndex: 3,
                            width: "70px",
                            minWidth: "70px",
                            maxWidth: "70px",
                            padding: "8px 4px",
                          }}
                        >
                          Time
                        </TableCell>
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                          <TableCell
                            key={day}
                            align="center"
                            sx={{
                              backgroundColor: "#9e0807",
                              color: "#ffffff",
                              fontWeight: 700,
                              border: "1px solid #7a0606",
                              width: "calc((100% - 70px) / 7)",
                            }}
                          >
                            {day}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {timeSlots.map((slot, rowIndex) => {
                        const rowSpanCells = new Set();

                        for (let prevRow = 0; prevRow < rowIndex; prevRow++) {
                          [0, 1, 2, 3, 4, 5, 6].forEach((dayIndex) => {
                            const prevKey = `${dayIndex}_${timeSlots[prevRow].time24}`;
                            const prevCellData = grid.get(prevKey);
                            if (prevCellData && prevCellData.startSlot === prevRow) {
                              const endRow = prevCellData.startSlot + prevCellData.rowSpan - 1;
                              if (rowIndex <= endRow && rowIndex > prevRow) {
                                rowSpanCells.add(dayIndex);
                              }
                            }
                          });
                        }

                        return (
                          <TableRow key={slot.time24}>
                            <TableCell
                              align="center"
                              sx={{
                                backgroundColor: "#fafafa",
                                fontWeight: 600,
                                borderRight: "1px solid #e0e0e0",
                                borderBottom: "1px solid #e0e0e0",
                                position: "sticky",
                                left: 0,
                                zIndex: 2,
                                whiteSpace: "nowrap",
                                width: "70px",
                                minWidth: "70px",
                                maxWidth: "70px",
                                padding: "8px 4px",
                              }}
                            >
                              {slot.time12}
                            </TableCell>
                            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                              if (rowSpanCells.has(dayIndex)) {
                                return null;
                              }

                              const key = `${dayIndex}_${slot.time24}`;
                              const cellData = grid.get(key);

                              if (cellData && cellData.startSlot === rowIndex) {
                                const { subject, parsed, rowSpan } = cellData;
                                return (
                                  <TableCell
                                    key={dayIndex}
                                    rowSpan={rowSpan}
                                    sx={{
                                      backgroundColor: "#f4c522",
                                      borderRight: "1px solid #d29119",
                                      borderBottom: "1px solid #d29119",
                                      p: 1,
                                      verticalAlign: "middle",
                                      textAlign: "center",
                                      width: "calc((100% - 70px) / 7)",
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        minHeight: "100%",
                                      }}
                                    >
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 700, color: "#333333", mb: 0.5 }}
                                      >
                                        {subject.subject_code}
                                        {subject.section && (
                                          <Chip
                                            label={subject.section}
                                            size="small"
                                            sx={{
                                              ml: 0.5,
                                              height: 18,
                                              fontSize: "0.7rem",
                                              backgroundColor: "rgba(158, 8, 7, 0.15)",
                                              color: "#9e0807",
                                              border: "1px solid rgba(158, 8, 7, 0.3)",
                                            }}
                                          />
                                        )}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        sx={{ color: "#333333", display: "block" }}
                                      >
                                        {parsed.start} - {parsed.end}
                                      </Typography>
                                      {parsed.room && (
                                        <Typography
                                          variant="caption"
                                          sx={{ color: "#333333", display: "block" }}
                                        >
                                          Room: {parsed.room}
                                        </Typography>
                                      )}
                                    </Box>
                                  </TableCell>
                                );
                              }

                              return (
                                <TableCell
                                  key={dayIndex}
                                  sx={{
                                    borderRight: "1px solid #e0e0e0",
                                    borderBottom: "1px solid #e0e0e0",
                                    minHeight: 40,
                                    width: "calc((100% - 70px) / 7)",
                                    backgroundColor: "#ffffff",
                                  }}
                                />
                              );
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

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleCloseDeleteDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              bgcolor: "#fffef7",
            },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 700,
              color: "#9e0807",
              fontFamily: "'Poppins', sans-serif",
              borderBottom: "1px solid rgba(244, 197, 34, 0.2)",
            }}
          >
            Delete Schedule?
          </DialogTitle>
          <DialogContent sx={{ p: 3, pt: 3 }}>
            <Typography sx={{ fontFamily: "'Poppins', sans-serif", color: "#666" }}>
              Are you sure you want to delete this schedule?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button
              onClick={handleCloseDeleteDialog}
              sx={{
                color: "#666",
                fontWeight: 600,
                textTransform: "none",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              variant="contained"
              sx={{
                bgcolor: "#d32f2f",
                color: "#fff",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: "20px",
                fontFamily: "'Poppins', sans-serif",
                "&:hover": {
                  bgcolor: "#b71c1c",
                },
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
