import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { initPushNotifications } from "../../utils/registerPush";

import {
  FiArrowRight,
  FiAward,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiLogIn,
  FiLayers,
  FiLock,
  FiPlayCircle,
  FiRadio,
  FiStar,
  FiTarget,
  FiUsers,
  FiAlertCircle,
} from "react-icons/fi";

import API from "../../services/api";

const badgeCatalog = [
  { label: "Fast Learner", icon: <FiAward /> },
  { label: "Code Master", icon: <FiBriefcase /> },
  { label: "Bug Hunter", icon: <FiTarget /> },
  { label: "Team Lead", icon: <FiUsers /> },
  { label: "UI Architect", icon: <FiLayers /> },
  { label: "Data Wizard", icon: <FiLock /> },
];

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const buildFallbackConsistency = (year = new Date().getUTCFullYear()) =>
  monthNames.map((name, monthIndex) => {
    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

    return {
      name,
      monthIndex,
      daysInMonth,
      days: Array.from({ length: daysInMonth }, (_, dayIndex) => ({
        day: dayIndex + 1,
        count: 0,
        intensity: 0,
      })),
    };
  });

const buildConsistencyGraph = (learningSummary) => {
  const summary = learningSummary || {
    year: new Date().getUTCFullYear(),
    months: buildFallbackConsistency(),
  };

  const year = summary.year || new Date().getUTCFullYear();
  const monthList = summary.months?.length > 0 ? summary.months : buildFallbackConsistency(year);
  const activityMap = new Map();
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysToRender = isLeapYear ? 366 : 365;

  monthList.forEach((month) => {
    month.days.forEach((day) => {
      const key = `${year}-${String((month.monthIndex ?? 0) + 1).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
      activityMap.set(key, day.count || 0);
    });
  });

  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const cells = [];

  for (let index = 0; index < daysToRender; index += 1) {
    const date = new Date(startOfYear);
    date.setUTCDate(startOfYear.getUTCDate() + index);

    const key = date.toISOString().slice(0, 10);
    const count = activityMap.get(key) || 0;
    const weekday = date.getUTCDay();

    cells.push({
      key,
      count,
      intensity: count >= 5 ? 4 : count >= 3 ? 3 : count >= 2 ? 2 : count >= 1 ? 1 : 0,
      weekday,
      weekIndex: Math.floor(index / 7),
      monthIndex: date.getUTCMonth(),
    });
  }

  const renderedWeeks = Math.ceil(cells.length / 7);
  const monthMarkers = monthList.map((month) => ({
    label: month.name.slice(0, 3),
    monthIndex: month.monthIndex ?? 0,
  }));

  return {
    year,
    monthMarkers,
    cells,
    renderedWeeks,
    activeDays: cells.filter((cell) => cell.count > 0).length,
    totalDays: cells.length,
  };
};

const activityIconMap = {
  account_registered: <FiUsers />,
  user_logged_in: <FiLogIn />,
  course_enrolled: <FiBookOpen />,
  assignment_submitted: <FiCheckCircle />,
  module_completed: <FiLayers />,
  lesson_started: <FiPlayCircle />,
  live_class_joined: <FiRadio />,
  xp_awarded: <FiStar />,
};

const formatTimeAgo = (value) => {
  if (!value) return "Just now";

  const date = new Date(value);
  const diffSeconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

function StudentDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [liveClasses, setLiveClasses] = useState([]);
  const [lessonProgress, setLessonProgress] = useState([]);
  const [courseLessonsMap, setCourseLessonsMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      initPushNotifications(token);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        const [dashboardRes, liveClassesRes, progressRes] = await Promise.all([
          API.get("/dashboard/student"),
          API.get("/live-classes/student"),
          API.get("/lessons/progress").catch(() => ({ data: [] })),
        ]);

        if (!isMounted) return;

        setDashboard(dashboardRes.data);
        setLessonProgress(progressRes.data || []);

        const extractedClasses =
          Array.isArray(liveClassesRes.data)
            ? liveClassesRes.data
            : Array.isArray(liveClassesRes.data?.classes)
            ? liveClassesRes.data.classes
            : Array.isArray(liveClassesRes.data?.data)
            ? liveClassesRes.data.data
            : [];

        setLiveClasses(extractedClasses);

        const enrolled = dashboardRes.data?.enrolledCourses || [];
        const lessonsMap = {};

        enrolled.forEach((item) => {
          const actualCourse = item.courseId || item.course || item;
          const cId = String(actualCourse._id || actualCourse);

          if (Array.isArray(actualCourse.modules)) {
            const allLessons = actualCourse.modules.flatMap(
              (mod) => mod.lessons || mod.content || []
            );
            lessonsMap[cId] = allLessons;
          }
        });

        if (isMounted) {
          setCourseLessonsMap(lessonsMap);
        }
      } catch (error) {
        console.error("Dashboard database synchronization failure:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleJoinClass = async (liveClass) => {
    try {
      const res = await API.post(`/live-classes/join/${liveClass._id}`);
      const meetingLink = res.data?.meetingLink || liveClass.meetingLink;

      if (meetingLink) {
        window.open(meetingLink, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Live streaming connection failure:", error);
    }
  };

  const viewModel = useMemo(() => {
    const studentName = dashboard?.profile?.fullName || "Student Account";
    const firstName = studentName.split(" ")[0] || "Student";
    const xp = dashboard?.xp ?? 0;
    const level = dashboard?.level ?? Math.max(1, Math.floor(xp / 100));
    const xpTarget = dashboard?.xpTarget ?? 1000;
    const xpProgress = dashboard?.xpProgress ?? Math.min(100, Math.round((xp / xpTarget) * 100));
    const currentStreak = dashboard?.learningSummary?.currentStreak ?? 0;
    const learningSummary = dashboard?.learningSummary || {
      activeDays: 0,
      totalDays: 365,
      activityCount: 0,
      months: buildFallbackConsistency(),
    };

    const badgeNames = Array.isArray(dashboard?.badges)
      ? dashboard.badges.map((badge) =>
          typeof badge === "string" ? badge : badge?.name || badge?.title || "Badge"
        )
      : [];

    const consistencyGraph = buildConsistencyGraph(learningSummary);

    const completedLessonIds = new Set(
      lessonProgress.map((p) => String(p.lesson?._id || p.lesson))
    );

    const courses =
      dashboard?.enrolledCourses?.length > 0
        ? dashboard.enrolledCourses.slice(0, 2).map((enrollment) => {
            const actualCourse = enrollment.courseId || enrollment.course || enrollment;
            const courseIdStr = String(actualCourse._id || actualCourse);

            let completedCount = 0;
            let totalCount = 0;

            const courseLessonsList = courseLessonsMap[courseIdStr] || [];

            if (courseLessonsList.length > 0) {
              totalCount = courseLessonsList.length;
              courseLessonsList.forEach((les) => {
                const lessonId = les._id || les;
                if (completedLessonIds.has(String(lessonId))) {
                  completedCount++;
                }
              });
            } else {
              completedCount =
                enrollment.completedLessonsCount ??
                enrollment.progress?.completedLessonsCount ??
                0;

              totalCount =
                enrollment.totalLessonsCount ??
                enrollment.progress?.totalLessonsCount ??
                actualCourse.totalLessonsCount ??
                0;
            }

            let calculatedProgress = 0;
            if (totalCount > 0) {
              calculatedProgress = Math.round((completedCount / totalCount) * 100);
            } else if (typeof enrollment.progress === "number") {
              calculatedProgress = enrollment.progress;
            }

            calculatedProgress = Math.max(0, Math.min(100, calculatedProgress));

            return {
              id: courseIdStr,
              title: actualCourse.title || "Untitled Program",
              description: actualCourse.description || "No overview provided.",
              progress: calculatedProgress,
              lessons: `Completed: ${completedCount} / ${totalCount}`,
              subLessonsLabel: `${calculatedProgress}% Complete • ${totalCount} Lessons`,
              status: calculatedProgress >= 100 ? "Completed" : "In Progress",
            };
          })
        : [];

    return {
      firstName,
      level,
      xp,
      xpTarget,
      xpProgress,
      currentStreak,
      learningSummary,
      badgeNames,
      consistencyGraph,
      courses,
      recentLiveSessions: [...liveClasses]
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
        .slice(0, 2),
      recentActivities: dashboard?.recentActivities || [],
    };
  }, [dashboard, liveClasses, lessonProgress, courseLessonsMap]);

  const previewActivities = viewModel.recentActivities.slice(0, 4);

  if (loading) {
    return (
      <div className="bx-pm-loading-pane">
        <div className="bx-pm-spinner"></div>
        <p className="mt-3 text-muted font-weight-bold">Fetching your Learning Process...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="student-dashboard"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <section className="student-hero">
        <div>
          <p className="student-hero-kicker">Hello, {viewModel.firstName}</p>
          <h1>
            You&apos;re on a {viewModel.currentStreak}-day learning streak. Keep the momentum going!
          </h1>
        </div>
      </section>

      <div className="student-dashboard-grid">
        <div className="student-dashboard-main">
          <div className="student-summary-row">
            <motion.article
              className="student-card student-level-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
            >
              <div>
                <span className="student-card-label">Current Level</span>
                <h2>Level {viewModel.level}</h2>
                <p>
                  {viewModel.xp.toLocaleString()} XP / {viewModel.xpTarget.toLocaleString()} XP
                </p>
                <div className="student-level-bar" aria-hidden="true">
                  <span style={{ width: `${viewModel.xpProgress}%` }} />
                </div>
              </div>

              <div className="student-ring-wrap" aria-label={`${viewModel.xpProgress}% complete`}>
                <svg viewBox="0 0 120 120" className="student-ring">
                  <circle className="student-ring-track" cx="60" cy="60" r="48" />
                  <circle
                    className="student-ring-progress"
                    cx="60"
                    cy="60"
                    r="48"
                    style={{ strokeDashoffset: 301 - (301 * viewModel.xpProgress) / 100 }}
                  />
                </svg>
                <strong>{viewModel.xpProgress}%</strong>
              </div>
            </motion.article>

            <motion.article
              className="student-card student-consistency-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12 }}
            >
              <div className="student-card-header-row">
                <h3>Learning Consistency</h3>
                <div className="student-legend">
                  <span>Less</span>
                  <div className="student-legend-swatch" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <span>More</span>
                </div>
              </div>

              <div className="student-consistency-chart">
                <div className="student-consistency-months" aria-hidden="true">
                  {viewModel.consistencyGraph.monthMarkers.map((month) => (
                    <span key={month.label}>{month.label}</span>
                  ))}
                </div>

                <div className="student-consistency-body">
                  <div className="student-consistency-weekdays" aria-hidden="true">
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                  </div>

                  <div className="student-consistency-grid" aria-label="Yearly learning consistency heatmap">
                    {viewModel.consistencyGraph.cells.map((cell) => (
                      <span
                        key={cell.key}
                        className={`student-consistency-box is-${cell.intensity}`}
                        title={`${cell.key}: ${cell.count} activities`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.article>
          </div>

          <section className="student-section">
            <div className="student-section-head">
              <h3>Earned Badges</h3>
              <button type="button">View All</button>
            </div>

            <div className="student-badge-grid">
              {badgeCatalog.map((badge) => {
                const active = viewModel.badgeNames.includes(badge.label);

                return (
                  <motion.article
                    key={badge.label}
                    className={`student-badge-card${active ? " is-earned" : " is-muted"}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32 }}
                  >
                    <span className="student-badge-icon" aria-hidden="true">
                      {badge.icon}
                    </span>
                    <strong>{badge.label}</strong>
                  </motion.article>
                );
              })}
            </div>
          </section>

          <section className="student-section">
            <div className="student-section-head student-section-head-inline">
              <h3>Continue Learning</h3>
              <div className="student-carousel-actions" aria-hidden="true">
                <Link to="/student/courses" className="student-action-icon-link">
                  <FiArrowRight />
                </Link>
              </div>
            </div>

            <div className="student-course-grid">
              {viewModel.courses.length > 0 ? (
                viewModel.courses.map((course, index) => (
                  <motion.article
                    key={course.id || index}
                    className="student-course-card"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                  >
                    <div className="student-course-preview">
                      <span>{course.status}</span>
                      <FiPlayCircle />
                    </div>

                    <div className="student-course-body">
                      <h4>{course.title}</h4>
                      <p>{course.description}</p>

                      <div className="student-course-meta">
                        <span>{course.lessons}</span>
                        <span>{course.subLessonsLabel}</span>
                      </div>

                      <div className="student-course-bar" aria-hidden="true">
                        <span style={{ width: `${course.progress}%` }} />
                      </div>

                      <Link
                        to={`/student/courses/${course.id}`}
                        className="student-course-button"
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
                      >
                        Continue Learning <FiArrowRight style={{ marginLeft: "8px" }} />
                      </Link>
                    </div>
                  </motion.article>
                ))
              ) : (
                <div
                  className="student-activity-item student-activity-empty w-100"
                  style={{
                    padding: "2.5rem 1.5rem",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "12px",
                    border: "1px dashed rgba(255,255,255,0.1)",
                    display: "flex",
                    gap: "1rem",
                    alignItems: "center",
                  }}
                >
                  <span
                    className="student-activity-icon"
                    style={{ fontSize: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                    aria-hidden="true"
                  >
                    <FiAlertCircle />
                  </span>
                  <div>
                    <strong style={{ display: "block", fontSize: "1rem", color: "grey" }}>
                      No course registered yet
                    </strong>
                    <p style={{ fontSize: "0.85rem", color: "grey", margin: "4px 0 0 0" }}>
                      Explore the hub catalog to enroll in a program and kickstart your learning path.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="student-dashboard-side">
          <motion.section
            className="student-side-card"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
          >
            <div className="student-side-head">
              <h3>Upcoming Live</h3>
              <Link className="student-see-more-link" to="/student/live-classes">
                See more <FiArrowRight />
              </Link>
            </div>

            <div className="student-live-list">
              {viewModel.recentLiveSessions.length > 0 ? (
                viewModel.recentLiveSessions.map((session) => {
                  const classDate = new Date(session.startTime);
                  const isLiveNow = classDate <= new Date();

                  return (
                    <article key={session._id} className="student-live-card">
                      <div className="student-live-meta">
                        <FiCalendar />
                        <span>
                          {classDate.toLocaleDateString([], { month: "short", day: "numeric" })} at{" "}
                          {classDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isLiveNow && (
                          <span className="student-live-pill" style={{ marginLeft: "auto", fontSize: "0.7rem" }}>
                            LIVE NOW
                          </span>
                        )}
                      </div>
                      <h4>{session.title}</h4>
                      <p>Mentor: {session.instructor?.fullName || "Unassigned Faculty"}</p>

                      <button
                        type="button"
                        className="student-live-button"
                        onClick={() => handleJoinClass(session)}
                      >
                        Initialize Live Stream Bridge
                      </button>
                    </article>
                  );
                })
              ) : (
                <div className="student-activity-item student-activity-empty" style={{ padding: "1rem 0" }}>
                  <span className="student-activity-icon" aria-hidden="true">
                    <FiAlertCircle />
                  </span>
                  <div>
                    <strong style={{ display: "block", fontSize: "0.75rem" }}>No live streams available</strong>
                    <p style={{ fontSize: "0.75rem" }}>Check back later for active sessions.</p>
                  </div>
                </div>
              )}
            </div>
          </motion.section>

          <motion.section
            className="student-side-card"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
          >
            <div className="student-section-head">
              <h3>Activity Log</h3>
              <Link className="student-see-more-link" to="/student/notifications">
                See more <FiArrowRight />
              </Link>
            </div>

            <div className="student-activity-list">
              {previewActivities.length > 0 ? (
                previewActivities.map((item, index) => (
                  <motion.article
                    key={item._id || `${item.type}-${item.createdAt}`}
                    className="student-activity-item"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <span className="student-activity-icon" aria-hidden="true">
                      {activityIconMap[item.type] || <FiClock />}
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{(item.type || "").replaceAll("_", " ")}</p>
                      <span>{formatTimeAgo(item.createdAt)}</span>
                    </div>
                  </motion.article>
                ))
              ) : (
                <article className="student-activity-item student-activity-empty">
                  <span className="student-activity-icon" aria-hidden="true">
                    <FiClock />
                  </span>
                  <div>
                    <strong>No recent activity yet</strong>
                    <p>New actions will show here.</p>
                  </div>
                </article>
              )}
            </div>
          </motion.section>
        </aside>
      </div>

      <footer className="student-footer">
        <p>© 2026 Benedex Digital Hub. Built for African Excellence.</p>
        <p>Empowering the next generation of African digital leaders.</p>
        <div>
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>Currency: NGN</span>
          <span>Contact Support</span>
        </div>
      </footer>
    </motion.div>
  );
}

export default StudentDashboard;