import { useEffect, useMemo, useState } from "react";
import mammoth from "mammoth";
import { API } from "./api";

const getToken = () => {
  return localStorage.getItem("joborbit_token") || "";
};

const getAuthHeaders = () => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const isJobExpired = (deadline) => {
  if (!deadline) return false;

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) return false;

  return date <= new Date();
};

const formatDate = (date) => {
  if (!date) return "Not set";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Not set";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getApplicationStatusStyle = (status) => {
  switch (status) {
    case "Shortlisted":
      return {
        background: "#dcfce7",
        color: "#15803d",
      };

    case "Rejected":
      return {
        background: "#fee2e2",
        color: "#b91c1c",
      };

    case "Reviewed":
      return {
        background: "#dbeafe",
        color: "#1d4ed8",
      };

    default:
      return {
        background: "#fef3c7",
        color: "#92400e",
      };
  }
};

const emptyEditForm = {
  title: "",
  company: "",
  location: "",
  type: "Full-time",
  salary: "",
  skills: "",
  description: "",
  vacancies: "1",
  deadline: "",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  padding: "11px 12px",
  fontSize: "14px",
  outline: "none",
  background: "#ffffff",
  color: "#111827",
};

export default function AdminDashboard({ token: propToken, onBack }) {
  const token = propToken || getToken();

  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    shortlistedApplications: 0,
    pendingApplications: 0,
  });

  const [editingJob, setEditingJob] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);

  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState("All");

  const [applicationSearch, setApplicationSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedApplication, setSelectedApplication] = useState(null);

  const [selectedResume, setSelectedResume] = useState(null);
  const [resumeType, setResumeType] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);

  const [activeSection, setActiveSection] = useState("overview");

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  const handleApiError = async (response, fallback) => {
    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.message || fallback);
    }

    return data;
  };

  // =========================
  // LOAD JOBS
  // =========================

  const loadJobs = async () => {
    try {
      const response = await fetch(`${API}/jobs`);

      const data = await handleApiError(
        response,
        "Failed to load jobs"
      );

      const jobList = Array.isArray(data)
        ? data
        : Array.isArray(data.jobs)
        ? data.jobs
        : [];

      setJobs(jobList);

      return jobList;
    } catch (err) {
      console.error("Load jobs error:", err);
      setError(err.message || "Failed to load jobs");
      return [];
    }
  };

  // =========================
  // LOAD APPLICATIONS
  // =========================

  const loadApplications = async () => {
    try {
      const response = await fetch(`${API}/applications`, {
        headers: getAuthHeaders(),
      });

      const data = await handleApiError(
        response,
        "Failed to load applications"
      );

      const applicationList = Array.isArray(data)
        ? data
        : Array.isArray(data.applications)
        ? data.applications
        : [];

      setApplications(applicationList);

      return applicationList;
    } catch (err) {
      console.error("Load applications error:", err);
      setError(err.message || "Failed to load applications");
      return [];
    }
  };

  // =========================
  // LOAD STATS
  // =========================

  const loadStats = async () => {
    try {
      setStatsLoading(true);

      const response = await fetch(`${API}/jobs/admin/stats`, {
        headers: getAuthHeaders(),
      });

      const data = await handleApiError(
        response,
        "Failed to load admin stats"
      );

      setStats({
        totalUsers: Number(data.totalUsers || 0),
        totalAdmins: Number(data.totalAdmins || 0),
        totalJobs: Number(data.totalJobs || 0),
        activeJobs: Number(data.activeJobs || 0),
        totalApplications: Number(data.totalApplications || 0),
        shortlistedApplications: Number(
          data.shortlistedApplications || 0
        ),
        pendingApplications: Number(
          data.pendingApplications || 0
        ),
      });

      return data;
    } catch (err) {
      console.error("Load stats error:", err);
      setError(err.message || "Failed to load admin stats");
    } finally {
      setStatsLoading(false);
    }
  };

  // =========================
  // LOAD DASHBOARD
  // =========================

  const loadDashboard = async () => {
    clearMessages();

    if (!token && !getToken()) {
      setError("Admin token nahi mila. Dobara login karo.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      await Promise.all([
        loadJobs(),
        loadApplications(),
        loadStats(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // =========================
  // EDIT JOB
  // =========================

  const startEditJob = (job) => {
    let deadlineValue = "";

    if (job.deadline) {
      const date = new Date(job.deadline);

      if (!Number.isNaN(date.getTime())) {
        deadlineValue = date.toISOString().split("T")[0];
      }
    }

    setEditingJob(job);

    setEditForm({
      title: job.title || "",
      company: job.company || "",
      location: job.location || "",
      type: job.type || "Full-time",
      salary: job.salary || "",
      skills: Array.isArray(job.skills)
        ? job.skills.join(", ")
        : "",
      description: job.description || "",
      vacancies: String(job.vacancies || 1),
      deadline: deadlineValue,
    });

    clearMessages();

    setActiveSection("jobs");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const cancelEdit = () => {
    setEditingJob(null);
    setEditForm(emptyEditForm);
  };

  // =========================
  // UPDATE JOB
  // =========================

  const updateJob = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!editingJob?._id) {
      setError("Job ID nahi mili.");
      return;
    }

    if (
      !editForm.title.trim() ||
      !editForm.company.trim() ||
      !editForm.location.trim()
    ) {
      setError("Title, company aur location required hain.");
      return;
    }

    const vacancies = Number(editForm.vacancies);

    if (!vacancies || vacancies < 1) {
      setError("Vacancies minimum 1 honi chahiye.");
      return;
    }

    if (!editForm.deadline) {
      setError("Application deadline required hai.");
      return;
    }

    const deadlineDate = new Date(
      `${editForm.deadline}T23:59:59`
    );

    if (
      Number.isNaN(deadlineDate.getTime()) ||
      deadlineDate <= new Date()
    ) {
      setError("Deadline future date honi chahiye.");
      return;
    }

    try {
      const response = await fetch(
        `${API}/jobs/${editingJob._id}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            title: editForm.title.trim(),
            company: editForm.company.trim(),
            location: editForm.location.trim(),
            type: editForm.type,
            salary: editForm.salary.trim(),
            skills: editForm.skills
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean),
            description: editForm.description.trim(),
            vacancies,
            deadline: `${editForm.deadline}T23:59:59`,
          }),
        }
      );

      await handleApiError(
        response,
        "Failed to update job"
      );

      setMessage("✅ Job updated successfully!");

      cancelEdit();

      await Promise.all([
        loadJobs(),
        loadStats(),
      ]);
    } catch (err) {
      console.error("Update job error:", err);
      setError(err.message || "Job update failed.");
    }
  };

  // =========================
  // DELETE JOB
  // =========================

  const deleteJob = async (jobId) => {
    if (!jobId) {
      setError("Job ID nahi mili.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this job?\n\nAll applications related to this job may also be removed."
    );

    if (!confirmed) return;

    try {
      clearMessages();

      const response = await fetch(
        `${API}/jobs/${jobId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      await handleApiError(
        response,
        "Failed to delete job"
      );

      setJobs((prev) =>
        prev.filter(
          (job) => String(job._id) !== String(jobId)
        )
      );

      setApplications((prev) =>
        prev.filter(
          (application) =>
            String(application.job?._id) !==
            String(jobId)
        )
      );

      setMessage("🗑️ Job deleted successfully!");

      await loadStats();
    } catch (err) {
      console.error("Delete job error:", err);
      setError(err.message || "Job delete failed.");
    }
  };

  // =========================
  // APPLICATION STATUS
  // =========================

  const updateApplicationStatus = async (
    applicationId,
    status
  ) => {
    if (!applicationId) {
      setError("Application ID nahi mili.");
      return;
    }

    try {
      clearMessages();

      const response = await fetch(
        `${API}/applications/${applicationId}/status`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            status,
          }),
        }
      );

      await handleApiError(
        response,
        "Failed to update application status"
      );

      setApplications((prev) =>
        prev.map((application) =>
          String(application._id) === String(applicationId)
            ? {
                ...application,
                status,
              }
            : application
        )
      );

      setSelectedApplication((prev) =>
        prev &&
        String(prev._id) === String(applicationId)
          ? {
              ...prev,
              status,
            }
          : prev
      );

      setMessage(
        `Application marked as ${status}.`
      );

      await loadStats();
    } catch (err) {
      console.error("Status update error:", err);
      setError(
        err.message ||
          "Application status update failed."
      );
    }
  };

  // =========================
  // RESUME PREVIEW
  // =========================

  const openResume = async (application) => {
    if (!application?.resume) {
      setError("Resume available nahi hai.");
      return;
    }

    try {
      clearMessages();

      setResumeLoading(true);
      setSelectedResume(application);
      setResumeText("");

      const resumeUrl = application.resume;
      const lowerUrl = String(resumeUrl).toLowerCase();

      if (
        lowerUrl.includes(".pdf") ||
        lowerUrl.includes("application/pdf")
      ) {
        setResumeType("pdf");
        return;
      }

      if (
        lowerUrl.includes(".docx") ||
        lowerUrl.includes(
          "application/vnd.openxmlformats"
        )
      ) {
        setResumeType("docx");

        const response = await fetch(resumeUrl);

        if (!response.ok) {
          throw new Error(
            "DOCX resume load nahi ho paaya."
          );
        }

        const arrayBuffer =
          await response.arrayBuffer();

        const result =
          await mammoth.extractRawText({
            arrayBuffer,
          });

        setResumeText(
          result.value ||
            "Resume me readable text nahi mila."
        );

        return;
      }

      setResumeType("other");
    } catch (err) {
      console.error("Resume preview error:", err);

      setError(
        "Resume preview nahi ho paaya."
      );
    } finally {
      setResumeLoading(false);
    }
  };

  const closeResume = () => {
    setSelectedResume(null);
    setResumeType("");
    setResumeText("");
    setResumeLoading(false);
  };

  const downloadResume = (application) => {
    if (!application?.resume) {
      setError("Resume available nahi hai.");
      return;
    }

    window.open(
      application.resume,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =========================
  // JOB FILTER
  // =========================

  const filteredJobs = useMemo(() => {
    const search = jobSearch.trim().toLowerCase();

    return jobs.filter((job) => {
      const expired = isJobExpired(job.deadline);

      const searchableText = [
        job.title,
        job.company,
        job.location,
        job.type,
        job.salary,
        ...(Array.isArray(job.skills)
          ? job.skills
          : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search ||
        searchableText.includes(search);

      const matchesStatus =
        jobStatusFilter === "All" ||
        (jobStatusFilter === "Active" && !expired) ||
        (jobStatusFilter === "Closed" && expired);

      return matchesSearch && matchesStatus;
    });
  }, [jobs, jobSearch, jobStatusFilter]);

  // =========================
  // APPLICATION FILTER
  // =========================

  const filteredApplications = useMemo(() => {
    const search =
      applicationSearch.trim().toLowerCase();

    return applications.filter(
      (application) => {
        const job = application.job || {};

        const searchableText = [
          application.applicantName,
          application.applicantEmail,
          application.phone,
          application.status,
          job.title,
          job.company,
          job.location,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !search ||
          searchableText.includes(search);

        const matchesStatus =
          statusFilter === "All" ||
          application.status === statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );
  }, [
    applications,
    applicationSearch,
    statusFilter,
  ]);

  // =========================
  // STAT CARDS
  // =========================

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: "👥",
      description: "Registered users",
    },
    {
      title: "Admins",
      value: stats.totalAdmins,
      icon: "🛡️",
      description: "Admin accounts",
    },
    {
      title: "Total Jobs",
      value: stats.totalJobs,
      icon: "💼",
      description: "All posted jobs",
    },
    {
      title: "Active Jobs",
      value: stats.activeJobs,
      icon: "🟢",
      description: "Currently active",
    },
    {
      title: "Applications",
      value: stats.totalApplications,
      icon: "📄",
      description: "Total applications",
    },
    {
      title: "Shortlisted",
      value: stats.shortlistedApplications,
      icon: "⭐",
      description: "Shortlisted candidates",
    },
    {
      title: "Pending",
      value: stats.pendingApplications,
      icon: "⏳",
      description: "Pending review",
    },
  ];

  // =========================
  // TOKEN ERROR SCREEN
  // =========================

  if (!token && !getToken()) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f7fb",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "500px",
            background: "#ffffff",
            borderRadius: "20px",
            padding: "35px",
            textAlign: "center",
            boxShadow:
              "0 15px 40px rgba(15,23,42,0.1)",
          }}
        >
          <div style={{ fontSize: "55px" }}>
            🔐
          </div>

          <h2
            style={{
              margin: "15px 0 8px",
              color: "#111827",
            }}
          >
            Admin Login Required
          </h2>

          <p
            style={{
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            Admin dashboard open karne ke liye
            admin account se login karo.
          </p>

          <button
            type="button"
            onClick={onBack}
            style={{
              marginTop: "15px",
              border: "none",
              background: "#111827",
              color: "#ffffff",
              padding: "12px 20px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "700",
            }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f8fafc, #eef2ff)",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "1450px",
          margin: "0 auto",
        }}
      >
        {/* =========================
            HEADER
        ========================= */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "22px",
            marginBottom: "20px",
            boxShadow:
              "0 10px 30px rgba(15,23,42,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#eef2ff",
                color: "#4338ca",
                padding: "6px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "800",
                marginBottom: "8px",
              }}
            >
              🛡️ ADMIN PANEL
            </div>

            <h1
              style={{
                margin: 0,
                color: "#111827",
                fontSize: "30px",
              }}
            >
              JobOrbit Admin Dashboard
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#6b7280",
              }}
            >
              Manage jobs, candidates and
              applications from one place.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "9px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={loadDashboard}
              style={{
                border: "none",
                background: "#eef2ff",
                color: "#4338ca",
                padding: "11px 15px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "700",
              }}
            >
              🔄 Refresh
            </button>

            <button
              type="button"
              onClick={onBack}
              style={{
                border: "none",
                background: "#111827",
                color: "#ffffff",
                padding: "11px 17px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "700",
              }}
            >
              ← Back
            </button>
          </div>
        </div>

        {/* =========================
            ERROR / SUCCESS
        ========================= */}

        {message && (
          <div
            style={{
              background: "#ecfdf5",
              color: "#047857",
              border: "1px solid #a7f3d0",
              padding: "13px 16px",
              borderRadius: "12px",
              marginBottom: "16px",
              fontWeight: "700",
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              padding: "13px 16px",
              borderRadius: "12px",
              marginBottom: "16px",
              fontWeight: "700",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* =========================
            NAVIGATION
        ========================= */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "8px",
            marginBottom: "20px",
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            boxShadow:
              "0 5px 20px rgba(15,23,42,0.06)",
          }}
        >
          {[
            ["overview", "📊 Overview"],
            ["jobs", "💼 Jobs"],
            ["applications", "📄 Applications"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveSection(value)}
              style={{
                border: "none",
                background:
                  activeSection === value
                    ? "#111827"
                    : "#f8fafc",
                color:
                  activeSection === value
                    ? "#ffffff"
                    : "#4b5563",
                padding: "10px 15px",
                borderRadius: "9px",
                cursor: "pointer",
                fontWeight: "700",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* =========================
            OVERVIEW
        ========================= */}

        {activeSection === "overview" && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "15px",
                marginBottom: "20px",
              }}
            >
              {statCards.map((card) => (
                <div
                  key={card.title}
                  style={{
                    background: "#ffffff",
                    borderRadius: "17px",
                    padding: "19px",
                    border: "1px solid #e5e7eb",
                    boxShadow:
                      "0 7px 22px rgba(15,23,42,0.06)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "27px",
                      marginBottom: "9px",
                    }}
                  >
                    {card.icon}
                  </div>

                  <div
                    style={{
                      color: "#6b7280",
                      fontSize: "13px",
                      fontWeight: "700",
                    }}
                  >
                    {card.title}
                  </div>

                  <div
                    style={{
                      color: "#111827",
                      fontSize: "29px",
                      fontWeight: "900",
                      marginTop: "3px",
                    }}
                  >
                    {statsLoading
                      ? "..."
                      : card.value}
                  </div>

                  <div
                    style={{
                      color: "#9ca3af",
                      fontSize: "12px",
                      marginTop: "3px",
                    }}
                  >
                    {card.description}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "18px",
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "18px",
                  padding: "23px",
                  boxShadow:
                    "0 7px 22px rgba(15,23,42,0.06)",
                }}
              >
                <h2
                  style={{
                    margin: "0 0 8px",
                    color: "#111827",
                  }}
                >
                  📌 Quick Actions
                </h2>

                <p
                  style={{
                    color: "#6b7280",
                    fontSize: "14px",
                  }}
                >
                  Frequently used admin actions.
                </p>

                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    marginTop: "15px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSection("jobs")
                    }
                    style={{
                      border: "none",
                      background: "#eef2ff",
                      color: "#4338ca",
                      padding: "12px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      textAlign: "left",
                      fontWeight: "700",
                    }}
                  >
                    💼 Manage Jobs →
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveSection("applications")
                    }
                    style={{
                      border: "none",
                      background: "#ecfdf5",
                      color: "#047857",
                      padding: "12px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      textAlign: "left",
                      fontWeight: "700",
                    }}
                  >
                    📄 Review Applications →
                  </button>
                </div>
              </div>

              <div
                style={{
                  background:
                    "linear-gradient(135deg, #111827, #312e81)",
                  borderRadius: "18px",
                  padding: "23px",
                  color: "#ffffff",
                  boxShadow:
                    "0 10px 30px rgba(15,23,42,0.12)",
                }}
              >
                <div
                  style={{
                    fontSize: "40px",
                    marginBottom: "10px",
                  }}
                >
                  🚀
                </div>

                <h2 style={{ margin: "0 0 8px" }}>
                  JobOrbit
                </h2>

                <p
                  style={{
                    margin: 0,
                    color: "#d1d5db",
                    lineHeight: 1.6,
                  }}
                >
                  Your admin panel is ready to
                  manage jobs and candidates.
                </p>
              </div>
            </div>
          </>
        )}

        {/* =========================
            JOBS SECTION
        ========================= */}

        {activeSection === "jobs" && (
          <>
            {editingJob && (
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "19px",
                  padding: "23px",
                  marginBottom: "20px",
                  boxShadow:
                    "0 10px 30px rgba(15,23,42,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "18px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        color: "#111827",
                      }}
                    >
                      ✏️ Edit Job
                    </h2>

                    <p
                      style={{
                        margin: "5px 0 0",
                        color: "#6b7280",
                      }}
                    >
                      Update job details.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={cancelEdit}
                    style={{
                      border: "none",
                      background: "#f3f4f6",
                      color: "#374151",
                      padding: "9px 14px",
                      borderRadius: "9px",
                      cursor: "pointer",
                      fontWeight: "700",
                    }}
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={updateJob}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "13px",
                    }}
                  >
                    <input
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Job Title"
                      required
                      style={inputStyle}
                    />

                    <input
                      value={editForm.company}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          company: e.target.value,
                        }))
                      }
                      placeholder="Company"
                      required
                      style={inputStyle}
                    />

                    <input
                      value={editForm.location}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      placeholder="Location"
                      required
                      style={inputStyle}
                    />

                    <select
                      value={editForm.type}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          type: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    >
                      <option value="Full-time">
                        Full-time
                      </option>
                      <option value="Part-time">
                        Part-time
                      </option>
                      <option value="Internship">
                        Internship
                      </option>
                      <option value="Contract">
                        Contract
                      </option>
                    </select>

                    <input
                      value={editForm.salary}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          salary: e.target.value,
                        }))
                      }
                      placeholder="Salary"
                      style={inputStyle}
                    />

                    <input
                      type="number"
                      min="1"
                      value={editForm.vacancies}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          vacancies: e.target.value,
                        }))
                      }
                      placeholder="Vacancies"
                      required
                      style={inputStyle}
                    />

                    <input
                      type="date"
                      value={editForm.deadline}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          deadline: e.target.value,
                        }))
                      }
                      required
                      style={inputStyle}
                    />

                    <input
                      value={editForm.skills}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          skills: e.target.value,
                        }))
                      }
                      placeholder="Skills: React, Node, MongoDB"
                      style={inputStyle}
                    />
                  </div>

                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Job Description"
                    rows={6}
                    style={{
                      ...inputStyle,
                      marginTop: "13px",
                      resize: "vertical",
                    }}
                  />

                  <button
                    type="submit"
                    style={{
                      marginTop: "13px",
                      border: "none",
                      background:
                        "linear-gradient(135deg, #4f46e5, #7c3aed)",
                      color: "#ffffff",
                      padding: "12px 20px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontWeight: "800",
                    }}
                  >
                    💾 Update Job
                  </button>
                </form>
              </div>
            )}

            <div
              style={{
                background: "#ffffff",
                borderRadius: "19px",
                padding: "23px",
                boxShadow:
                  "0 10px 30px rgba(15,23,42,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      color: "#111827",
                    }}
                  >
                    💼 Manage Jobs
                  </h2>

                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "#6b7280",
                    }}
                  >
                    Search, edit and delete jobs.
                  </p>
                </div>

                <div
                  style={{
                    background: "#eef2ff",
                    color: "#4338ca",
                    padding: "8px 12px",
                    borderRadius: "9px",
                    fontWeight: "800",
                    fontSize: "13px",
                  }}
                >
                  {filteredJobs.length} Jobs
                </div>
              </div>

              {/* JOB FILTER */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(200px, 1fr) 180px",
                  gap: "10px",
                  marginBottom: "20px",
                }}
              >
                <input
                  value={jobSearch}
                  onChange={(e) =>
                    setJobSearch(e.target.value)
                  }
                  placeholder="🔎 Search title, company, location, skills..."
                  style={inputStyle}
                />

                <select
                  value={jobStatusFilter}
                  onChange={(e) =>
                    setJobStatusFilter(e.target.value)
                  }
                  style={inputStyle}
                >
                  <option value="All">
                    All Jobs
                  </option>
                  <option value="Active">
                    Active Jobs
                  </option>
                  <option value="Closed">
                    Closed Jobs
                  </option>
                </select>
              </div>

              {loading ? (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  Loading jobs...
                </div>
              ) : filteredJobs.length === 0 ? (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    background: "#f9fafb",
                    borderRadius: "12px",
                    color: "#6b7280",
                  }}
                >
                  <div
                    style={{
                      fontSize: "40px",
                      marginBottom: "8px",
                    }}
                  >
                    🔍
                  </div>

                  <strong>
                    No jobs found
                  </strong>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(290px, 1fr))",
                    gap: "17px",
                  }}
                >
                  {filteredJobs.map((job) => {
                    const expired =
                      isJobExpired(job.deadline);

                    return (
                      <div
                        key={job._id}
                        style={{
                          border:
                            "1px solid #e5e7eb",
                          borderRadius: "16px",
                          padding: "18px",
                          background: "#fafafa",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            gap: "10px",
                            alignItems:
                              "flex-start",
                          }}
                        >
                          <div
                            style={{
                              minWidth: 0,
                            }}
                          >
                            <h3
                              style={{
                                margin: 0,
                                color: "#111827",
                                wordBreak:
                                  "break-word",
                              }}
                            >
                              {job.title ||
                                "Untitled Job"}
                            </h3>

                            <p
                              style={{
                                margin:
                                  "5px 0",
                                color:
                                  "#4f46e5",
                                fontWeight:
                                  "800",
                              }}
                            >
                              {job.company ||
                                "Company"}
                            </p>
                          </div>

                          <span
                            style={{
                              background: expired
                                ? "#fee2e2"
                                : "#dcfce7",
                              color: expired
                                ? "#b91c1c"
                                : "#15803d",
                              padding:
                                "5px 9px",
                              borderRadius:
                                "20px",
                              fontSize:
                                "11px",
                              fontWeight:
                                "800",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {expired
                              ? "🔴 Closed"
                              : "🟢 Active"}
                          </span>
                        </div>

                        <div
                          style={{
                            color: "#6b7280",
                            fontSize: "14px",
                            lineHeight: 1.8,
                            marginTop: "11px",
                          }}
                        >
                          📍{" "}
                          {job.location ||
                            "Not specified"}
                          <br />
                          💼{" "}
                          {job.type ||
                            "Not specified"}
                          <br />
                          💰{" "}
                          {job.salary ||
                            "Not disclosed"}
                          <br />
                          👥 Vacancies:{" "}
                          {job.vacancies || 1}
                          <br />
                          📄 Applications:{" "}
                          {job.appliedCount || 0}
                          <br />
                          📅 Deadline:{" "}
                          {formatDate(
                            job.deadline
                          )}
                        </div>

                        {Array.isArray(
                          job.skills
                        ) &&
                          job.skills.length >
                            0 && (
                            <div
                              style={{
                                display:
                                  "flex",
                                flexWrap:
                                  "wrap",
                                gap: "6px",
                                marginTop:
                                  "12px",
                              }}
                            >
                              {job.skills
                                .slice(0, 8)
                                .map(
                                  (
                                    skill,
                                    index
                                  ) => (
                                    <span
                                      key={
                                        index
                                      }
                                      style={{
                                        background:
                                          "#eef2ff",
                                        color:
                                          "#4338ca",
                                        padding:
                                          "4px 8px",
                                        borderRadius:
                                          "7px",
                                        fontSize:
                                          "11px",
                                        fontWeight:
                                          "700",
                                      }}
                                    >
                                      {skill}
                                    </span>
                                  )
                                )}
                            </div>
                          )}

                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            marginTop: "16px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              startEditJob(
                                job
                              )
                            }
                            style={{
                              flex: 1,
                              border: "none",
                              background:
                                "#e0e7ff",
                              color:
                                "#4338ca",
                              padding:
                                "10px",
                              borderRadius:
                                "8px",
                              cursor:
                                "pointer",
                              fontWeight:
                                "800",
                            }}
                          >
                            ✏️ Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteJob(
                                job._id
                              )
                            }
                            style={{
                              flex: 1,
                              border: "none",
                              background:
                                "#fee2e2",
                              color:
                                "#b91c1c",
                              padding:
                                "10px",
                              borderRadius:
                                "8px",
                              cursor:
                                "pointer",
                              fontWeight:
                                "800",
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* =========================
            APPLICATIONS SECTION
        ========================= */}

        {activeSection === "applications" && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "19px",
              padding: "23px",
              boxShadow:
                "0 10px 30px rgba(15,23,42,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "18px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "#111827",
                  }}
                >
                  📄 Applications
                </h2>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#6b7280",
                  }}
                >
                  Review and manage candidates.
                </p>
              </div>

              <div
                style={{
                  background: "#ecfdf5",
                  color: "#047857",
                  padding: "8px 12px",
                  borderRadius: "9px",
                  fontWeight: "800",
                  fontSize: "13px",
                }}
              >
                {filteredApplications.length} Applications
              </div>
            </div>

            {/* SEARCH */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(200px, 1fr) 180px",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              <input
                value={applicationSearch}
                onChange={(e) =>
                  setApplicationSearch(
                    e.target.value
                  )
                }
                placeholder="🔎 Search applicant, email, phone, job..."
                style={inputStyle}
              />

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="All">
                  All Status
                </option>
                <option value="Pending">
                  Pending
                </option>
                <option value="Reviewed">
                  Reviewed
                </option>
                <option value="Shortlisted">
                  Shortlisted
                </option>
                <option value="Rejected">
                  Rejected
                </option>
              </select>
            </div>

            {loading ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                Loading applications...
              </div>
            ) : filteredApplications.length ===
              0 ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  background: "#f9fafb",
                  borderRadius: "12px",
                  color: "#6b7280",
                }}
              >
                <div
                  style={{
                    fontSize: "40px",
                    marginBottom: "8px",
                  }}
                >
                  📭
                </div>

                <strong>
                  No applications found
                </strong>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {filteredApplications.map(
                  (application) => {
                    const job =
                      application.job || {};

                    const status =
                      application.status ||
                      "Pending";

                    return (
                      <div
                        key={application._id}
                        style={{
                          border:
                            "1px solid #e5e7eb",
                          borderRadius: "16px",
                          padding: "18px",
                          background: "#fafafa",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            gap: "15px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              minWidth:
                                "240px",
                            }}
                          >
                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: "10px",
                                flexWrap:
                                  "wrap",
                              }}
                            >
                              <h3
                                style={{
                                  margin: 0,
                                  color:
                                    "#111827",
                                }}
                              >
                                {
                                  application.applicantName
                                }
                              </h3>

                              <span
                                style={{
                                  ...getApplicationStatusStyle(
                                    status
                                  ),
                                  padding:
                                    "5px 9px",
                                  borderRadius:
                                    "20px",
                                  fontSize:
                                    "11px",
                                  fontWeight:
                                    "800",
                                }}
                              >
                                {status}
                              </span>
                            </div>

                            <p
                              style={{
                                margin:
                                  "5px 0",
                                color:
                                  "#4f46e5",
                                fontWeight:
                                  "800",
                              }}
                            >
                              {job.title ||
                                "Job unavailable"}
                            </p>

                            <div
                              style={{
                                color:
                                  "#6b7280",
                                fontSize:
                                  "14px",
                                lineHeight:
                                  1.8,
                              }}
                            >
                              📧{" "}
                              {application.applicantEmail ||
                                "N/A"}
                              <br />

                              {application.phone && (
                                <>
                                  📱{" "}
                                  {
                                    application.phone
                                  }
                                  <br />
                                </>
                              )}

                              🏢{" "}
                              {job.company ||
                                "N/A"}
                              <br />

                              📍{" "}
                              {job.location ||
                                "N/A"}
                              <br />

                              📅 Applied:{" "}
                              {formatDate(
                                application.createdAt
                              )}
                            </div>
                          </div>

                          <div
                            style={{
                              minWidth:
                                "170px",
                            }}
                          >
                            <label
                              style={{
                                display:
                                  "block",
                                fontSize:
                                  "12px",
                                color:
                                  "#6b7280",
                                marginBottom:
                                  "5px",
                                fontWeight:
                                  "700",
                              }}
                            >
                              Application Status
                            </label>

                            <select
                              value={status}
                              onChange={(e) =>
                                updateApplicationStatus(
                                  application._id,
                                  e.target.value
                                )
                              }
                              style={{
                                ...inputStyle,
                                padding:
                                  "9px",
                              }}
                            >
                              <option value="Pending">
                                Pending
                              </option>

                              <option value="Reviewed">
                                Reviewed
                              </option>

                              <option value="Shortlisted">
                                Shortlisted
                              </option>

                              <option value="Rejected">
                                Rejected
                              </option>
                            </select>
                          </div>
                        </div>

                        {application.coverLetter && (
                          <div
                            style={{
                              marginTop: "14px",
                              background:
                                "#ffffff",
                              border:
                                "1px solid #e5e7eb",
                              borderRadius:
                                "10px",
                              padding: "13px",
                            }}
                          >
                            <strong
                              style={{
                                color:
                                  "#111827",
                              }}
                            >
                              Cover Letter
                            </strong>

                            <p
                              style={{
                                margin:
                                  "7px 0 0",
                                color:
                                  "#4b5563",
                                whiteSpace:
                                  "pre-wrap",
                                fontSize:
                                  "14px",
                                lineHeight:
                                  1.6,
                              }}
                            >
                              {
                                application.coverLetter
                              }
                            </p>
                          </div>
                        )}

                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            marginTop: "15px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedApplication(
                                application
                              )
                            }
                            style={{
                              border: "none",
                              background:
                                "#f3f4f6",
                              color:
                                "#374151",
                              padding:
                                "9px 13px",
                              borderRadius:
                                "8px",
                              cursor:
                                "pointer",
                              fontWeight:
                                "700",
                            }}
                          >
                            👤 Details
                          </button>

                          {application.resume && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  openResume(
                                    application
                                  )
                                }
                                style={{
                                  border:
                                    "none",
                                  background:
                                    "#e0e7ff",
                                  color:
                                    "#4338ca",
                                  padding:
                                    "9px 13px",
                                  borderRadius:
                                    "8px",
                                  cursor:
                                    "pointer",
                                  fontWeight:
                                    "700",
                                }}
                              >
                                👁️ Preview Resume
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  downloadResume(
                                    application
                                  )
                                }
                                style={{
                                  border:
                                    "none",
                                  background:
                                    "#dcfce7",
                                  color:
                                    "#15803d",
                                  padding:
                                    "9px 13px",
                                  borderRadius:
                                    "8px",
                                  cursor:
                                    "pointer",
                                  fontWeight:
                                    "700",
                                }}
                              >
                                ⬇️ Open Resume
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================
          APPLICATION DETAILS MODAL
      ========================= */}

      {selectedApplication && (
        <div
          onClick={() =>
            setSelectedApplication(null)
          }
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,0.65)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
            zIndex: 9998,
            boxSizing: "border-box",
          }}
        >
          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: "650px",
              maxHeight: "90vh",
              overflow: "auto",
              background: "#ffffff",
              borderRadius: "18px",
              padding: "24px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "#111827",
                  }}
                >
                  👤 Applicant Details
                </h2>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#6b7280",
                  }}
                >
                  Candidate information
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedApplication(null)
                }
                style={{
                  border: "none",
                  background: "#fee2e2",
                  color: "#b91c1c",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "20px",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                marginTop: "20px",
                display: "grid",
                gap: "11px",
              }}
            >
              <div
                style={{
                  background: "#f9fafb",
                  padding: "13px",
                  borderRadius: "10px",
                }}
              >
                <strong>Name</strong>
                <div
                  style={{
                    color: "#6b7280",
                    marginTop: "4px",
                  }}
                >
                  {
                    selectedApplication.applicantName
                  }
                </div>
              </div>

              <div
                style={{
                  background: "#f9fafb",
                  padding: "13px",
                  borderRadius: "10px",
                }}
              >
                <strong>Email</strong>
                <div
                  style={{
                    color: "#6b7280",
                    marginTop: "4px",
                  }}
                >
                  {
                    selectedApplication.applicantEmail
                  }
                </div>
              </div>

              <div
                style={{
                  background: "#f9fafb",
                  padding: "13px",
                  borderRadius: "10px",
                }}
              >
                <strong>Phone</strong>
                <div
                  style={{
                    color: "#6b7280",
                    marginTop: "4px",
                  }}
                >
                  {selectedApplication.phone ||
                    "Not provided"}
                </div>
              </div>

              <div
                style={{
                  background: "#f9fafb",
                  padding: "13px",
                  borderRadius: "10px",
                }}
              >
                <strong>Applied For</strong>
                <div
                  style={{
                    color: "#6b7280",
                    marginTop: "4px",
                  }}
                >
                  {selectedApplication.job
                    ?.title ||
                    "Job unavailable"}
                </div>
              </div>

              <div
                style={{
                  background: "#f9fafb",
                  padding: "13px",
                  borderRadius: "10px",
                }}
              >
                <strong>Company</strong>
                <div
                  style={{
                    color: "#6b7280",
                    marginTop: "4px",
                  }}
                >
                  {selectedApplication.job
                    ?.company ||
                    "N/A"}
                </div>
              </div>

              <div
                style={{
                  background: "#f9fafb",
                  padding: "13px",
                  borderRadius: "10px",
                }}
              >
                <strong>Status</strong>

                <div style={{ marginTop: "7px" }}>
                  <span
                    style={{
                      ...getApplicationStatusStyle(
                        selectedApplication.status ||
                          "Pending"
                      ),
                      display:
                        "inline-block",
                      padding:
                        "6px 10px",
                      borderRadius:
                        "20px",
                      fontWeight:
                        "800",
                      fontSize:
                        "12px",
                    }}
                  >
                    {selectedApplication.status ||
                      "Pending"}
                  </span>
                </div>
              </div>
            </div>

            {selectedApplication.resume && (
              <div
                style={{
                  display: "flex",
                  gap: "9px",
                  marginTop: "18px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    openResume(
                      selectedApplication
                    )
                  }
                  style={{
                    border: "none",
                    background:
                      "#e0e7ff",
                    color:
                      "#4338ca",
                    padding:
                      "10px 14px",
                    borderRadius:
                      "9px",
                    cursor:
                      "pointer",
                    fontWeight:
                      "800",
                  }}
                >
                  👁️ Preview Resume
                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadResume(
                      selectedApplication
                    )
                  }
                  style={{
                    border: "none",
                    background:
                      "#dcfce7",
                    color:
                      "#15803d",
                    padding:
                      "10px 14px",
                    borderRadius:
                      "9px",
                    cursor:
                      "pointer",
                    fontWeight:
                      "800",
                  }}
                >
                  ⬇️ Open Resume
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================
          RESUME MODAL
      ========================= */}

      {selectedResume && (
        <div
          onClick={closeResume}
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,0.72)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
            zIndex: 9999,
            boxSizing: "border-box",
          }}
        >
          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: "1050px",
              height: "min(90vh, 850px)",
              background: "#ffffff",
              borderRadius: "18px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom:
                  "1px solid #e5e7eb",
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div>
                <strong
                  style={{
                    color: "#111827",
                  }}
                >
                  📄 Resume Preview
                </strong>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    marginTop: "3px",
                  }}
                >
                  {
                    selectedResume.applicantName
                  }
                </div>
              </div>

              <button
                type="button"
                onClick={closeResume}
                style={{
                  border: "none",
                  background:
                    "#fee2e2",
                  color: "#b91c1c",
                  width: "36px",
                  height: "36px",
                  borderRadius:
                    "50%",
                  cursor: "pointer",
                  fontSize: "19px",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflow: "auto",
                background: "#f3f4f6",
              }}
            >
              {resumeLoading ? (
                <div
                  style={{
                    padding: "50px",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  <div
                    style={{
                      fontSize: "35px",
                      marginBottom: "10px",
                    }}
                  >
                    ⏳
                  </div>

                  Loading resume...
                </div>
              ) : resumeType === "pdf" ? (
                <iframe
                  src={selectedResume.resume}
                  title="Resume Preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                />
              ) : resumeType === "docx" ? (
                <div
                  style={{
                    background:
                      "#ffffff",
                    minHeight:
                      "100%",
                    padding: "30px",
                    boxSizing:
                      "border-box",
                  }}
                >
                  <pre
                    style={{
                      whiteSpace:
                        "pre-wrap",
                      wordBreak:
                        "break-word",
                      fontFamily:
                        "Arial, sans-serif",
                      lineHeight:
                        1.6,
                      color:
                        "#111827",
                      margin: 0,
                    }}
                  >
                    {resumeText}
                  </pre>
                </div>
              ) : (
                <div
                  style={{
                    padding: "50px",
                    textAlign:
                      "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "45px",
                    }}
                  >
                    📎
                  </div>

                  <h3>
                    Preview not available
                  </h3>

                  <p
                    style={{
                      color:
                        "#6b7280",
                    }}
                  >
                    Is file type ka
                    preview available
                    nahi hai.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      downloadResume(
                        selectedResume
                      )
                    }
                    style={{
                      border: "none",
                      background:
                        "#4f46e5",
                      color:
                        "#ffffff",
                      padding:
                        "10px 16px",
                      borderRadius:
                        "9px",
                      cursor:
                        "pointer",
                      fontWeight:
                        "700",
                    }}
                  >
                    Open Resume
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}