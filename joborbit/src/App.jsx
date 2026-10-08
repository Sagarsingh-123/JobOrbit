import React, { useCallback, useEffect, useMemo, useState } from "react";
import Auth from "./auth";
import PostJob from "./postjob";
import AdminDashboard from "./AdminDashboard";
import { API } from "./api";
import "./App.css";

const inputStyle = {
  width: "100%",
  padding: "12px",
  border: "1px solid #d6dce8",
  borderRadius: "8px",
  fontSize: "15px",
  boxSizing: "border-box",
  outline: "none",
};

const emptyApplication = {
  applicantName: "",
  applicantEmail: "",
  phone: "",
  resume: "",
  coverLetter: "",
};

async function readResponse(response) {
  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Server se JSON nahi mila (HTTP ${response.status}). Backend check karo.`
    );
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

function App() {
  const [search, setSearch] = useState("");

  const [showAuth, setShowAuth] = useState(false);
  const [showPostJob, setShowPostJob] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showMyApplications, setShowMyApplications] = useState(false);
  const [showSavedJobs, setShowSavedJobs] = useState(false);

  const [savedJobIds, setSavedJobIds] = useState([]);

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("joborbit_user")) || null;
    } catch {
      return null;
    }
  });

  const [adminLogin, setAdminLogin] = useState(false);

  const [selectedJob, setSelectedJob] = useState(null);
  const [detailsJob, setDetailsJob] = useState(null);

  const [jobs, setJobs] = useState([]);

  const [myApplications, setMyApplications] = useState([]);
  const [myApplicationsLoading, setMyApplicationsLoading] = useState(false);
  const [myApplicationsError, setMyApplicationsError] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [application, setApplication] = useState(emptyApplication);
  const [resumeFile, setResumeFile] = useState(null);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [applicationError, setApplicationError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [locationFilter, setLocationFilter] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [salaryFilter, setSalaryFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const getSavedJobsKey = () => {
    if (!user) return null;

    return `joborbit_saved_jobs_${
      user.id || user._id || user.email
    }`;
  };

  useEffect(() => {
    const key = getSavedJobsKey();

    if (!key) {
      setSavedJobIds([]);
      return;
    }

    try {
      const saved = JSON.parse(localStorage.getItem(key)) || [];

      setSavedJobIds(
        Array.isArray(saved)
          ? saved.map(String)
          : []
      );
    } catch {
      setSavedJobIds([]);
    }
  }, [user]);

  const toggleSavedJob = (job) => {
    if (!user) {
      setAdminLogin(false);
      setShowAuth(true);
      return;
    }

    if (user.role === "admin") {
      alert("Admin saved jobs nahi kar sakta.");
      return;
    }

    const key = getSavedJobsKey();
    const jobId = job?._id || job?.id;

    if (!key) {
      alert("User session nahi mili. Dobara login karo.");
      return;
    }

    if (!jobId) {
      console.error("Save failed - Job data:", job);
      alert("Job ID nahi mili. Backend jobs response check karo.");
      return;
    }

    setSavedJobIds((prev) => {
      const normalizedPrev = Array.isArray(prev)
        ? prev.map(String)
        : [];

      const id = String(jobId);

      const isSaved = normalizedPrev.includes(id);

      const updated = isSaved
        ? normalizedPrev.filter(
            (savedId) => savedId !== id
          )
        : [...normalizedPrev, id];

      localStorage.setItem(
        key,
        JSON.stringify(updated)
      );

      return updated;
    });
  };

  const isJobSaved = (jobId) => {
    if (!jobId) return false;

    return savedJobIds
      .map(String)
      .includes(String(jobId));
  };

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/jobs`);

      const data = await readResponse(response);

      if (!Array.isArray(data)) {
        throw new Error(
          "Jobs ka response sahi format mein nahi hai."
        );
      }

      setJobs(data);
    } catch (err) {
      setError(
        err.message ||
          "Backend se connection nahi ho paaya."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const savedUser =
      localStorage.getItem("joborbit_user");

    if (!savedUser) return;

    try {
      const parsed = JSON.parse(savedUser);

      setUser(parsed);

      if (parsed.role === "admin") {
        setShowAdmin(true);
      }
    } catch {
      localStorage.removeItem("joborbit_user");
      localStorage.removeItem("joborbit_token");
    }
  }, []);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);

    setShowAuth(false);
    setShowMyApplications(false);
    setShowSavedJobs(false);
    setShowPostJob(false);
    setSelectedJob(null);
    setDetailsJob(null);
    setAdminLogin(false);

    if (loggedInUser.role === "admin") {
      setShowAdmin(true);
    } else {
      setShowAdmin(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("joborbit_token");
    localStorage.removeItem("joborbit_user");

    setUser(null);
    setShowAuth(false);
    setShowAdmin(false);
    setShowPostJob(false);
    setShowMyApplications(false);
    setShowSavedJobs(false);
    setSelectedJob(null);
    setDetailsJob(null);
    setAdminLogin(false);
    setSavedJobIds([]);

    clearFilters();
  };

  const loadMyApplications = async () => {
    const token =
      localStorage.getItem("joborbit_token");

    if (!token || !user) {
      setAdminLogin(false);
      setShowAuth(true);
      return;
    }

    setMyApplicationsLoading(true);
    setMyApplicationsError("");

    try {
      const response = await fetch(
        `${API}/applications/my`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await readResponse(response);

      setMyApplications(
        Array.isArray(data) ? data : []
      );

      setShowMyApplications(true);
    } catch (err) {
      setMyApplicationsError(
        err.message ||
          "Applications load nahi ho paayi."
      );
    } finally {
      setMyApplicationsLoading(false);
    }
  };

  const isJobExpired = (job) => {
    if (!job?.deadline) return false;

    const deadline = new Date(job.deadline);

    if (isNaN(deadline.getTime())) {
      return false;
    }

    return deadline < new Date();
  };

  const isJobFull = (job) => {
    const vacancies = Number(job?.vacancies);
    const applied = Number(job?.appliedCount || 0);

    if (!Number.isFinite(vacancies) || vacancies < 1) {
      return false;
    }

    return applied >= vacancies;
  };

  const formatDeadline = (deadline) => {
    if (!deadline) {
      return "Not specified";
    }

    const date = new Date(deadline);

    if (isNaN(date.getTime())) {
      return "Not specified";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const normalizeText = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase();
  };

  const getJobSkills = (job) => {
    if (Array.isArray(job?.skills)) {
      return job.skills;
    }

    if (typeof job?.skills === "string") {
      return job.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
    }

    return [];
  };

  const getSalaryNumber = (job) => {
    const salaryText = String(job?.salary || "");

    const numbers = salaryText
      .replace(/,/g, "")
      .match(/\d+(?:\.\d+)?/g);

    if (!numbers || numbers.length === 0) {
      return 0;
    }

    const parsedNumbers = numbers
      .map(Number)
      .filter((number) => Number.isFinite(number));

    if (parsedNumbers.length === 0) {
      return 0;
    }

    let highest = Math.max(...parsedNumbers);

    const lowerSalaryText = salaryText.toLowerCase();

    if (
      lowerSalaryText.includes("lpa") ||
      lowerSalaryText.includes("lac") ||
      lowerSalaryText.includes("lakh")
    ) {
      highest = highest * 100000;
    }

    return highest;
  };

  const locationOptions = useMemo(() => {
    const locations = jobs
      .map((job) => String(job.location || "").trim())
      .filter(Boolean);

    return [...new Set(locations)].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [jobs]);

  const jobTypeOptions = useMemo(() => {
    const types = jobs
      .map((job) => String(job.type || "").trim())
      .filter(Boolean);

    return [...new Set(types)].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [jobs]);

  const skillOptions = useMemo(() => {
    const allSkills = [];

    jobs.forEach((job) => {
      getJobSkills(job).forEach((skill) => {
        if (skill) {
          allSkills.push(String(skill).trim());
        }
      });
    });

    return [...new Set(allSkills)]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const searchValue = normalizeText(search);
    const selectedLocation = normalizeText(locationFilter);
    const selectedJobType = normalizeText(jobTypeFilter);
    const selectedSkill = normalizeText(skillFilter);

    const minimumSalary =
      Number(salaryFilter) > 0
        ? Number(salaryFilter)
        : 0;

    return jobs.filter((job) => {
      const title = normalizeText(job.title);
      const company = normalizeText(job.company);
      const location = normalizeText(job.location);
      const type = normalizeText(job.type);
      const description = normalizeText(job.description);

      const skills = getJobSkills(job).map(
        normalizeText
      );

      const searchableText = [
        title,
        company,
        location,
        type,
        description,
        ...skills,
      ].join(" ");

      if (
        searchValue &&
        !searchableText.includes(searchValue)
      ) {
        return false;
      }

      if (
        selectedLocation &&
        location !== selectedLocation
      ) {
        return false;
      }

      if (
        selectedJobType &&
        type !== selectedJobType
      ) {
        return false;
      }

      if (
        selectedSkill &&
        !skills.includes(selectedSkill)
      ) {
        return false;
      }

      if (minimumSalary > 0) {
        const jobSalary = getSalaryNumber(job);

        if (
          jobSalary === 0 ||
          jobSalary < minimumSalary
        ) {
          return false;
        }
      }

      if (statusFilter === "active") {
        if (isJobExpired(job)) {
          return false;
        }
      }

      if (statusFilter === "expired") {
        if (!isJobExpired(job)) {
          return false;
        }
      }

      return true;
    });
  }, [
    jobs,
    search,
    locationFilter,
    jobTypeFilter,
    salaryFilter,
    skillFilter,
    statusFilter,
  ]);

  const clearFilters = () => {
    setSearch("");
    setLocationFilter("");
    setJobTypeFilter("");
    setSalaryFilter("");
    setSkillFilter("");
    setStatusFilter("all");
  };

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(locationFilter) ||
    Boolean(jobTypeFilter) ||
    Boolean(salaryFilter) ||
    Boolean(skillFilter) ||
    statusFilter !== "all";

  const openApplication = (job) => {
    const token =
      localStorage.getItem("joborbit_token");

    if (!token || !user) {
      setAdminLogin(false);
      setShowAuth(true);
      return;
    }

    if (user.role === "admin") {
      alert("Admin accounts cannot apply for jobs.");
      return;
    }

    if (isJobExpired(job)) {
      alert(
        "Is job ki application deadline khatam ho chuki hai."
      );
      return;
    }

    if (isJobFull(job)) {
      alert("All vacancies for this job have been filled.");
      return;
    }

    setDetailsJob(null);
    setShowMyApplications(false);
    setSelectedJob(job);

    setApplication({
      ...emptyApplication,
      applicantName: user.name || "",
      applicantEmail: user.email || "",
    });
    setResumeFile(null);
    setApplicationMessage("");
    setApplicationError("");
  };

  const handleApplicationChange = (e) => {
    const { name, value } = e.target;

    setApplication((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "resume" && value) {
      setResumeFile(null);
    }
  };

  const handleResumeFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      setApplicationError(
        "Sirf PDF, DOC ya DOCX file upload kar sakte ho."
      );

      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setApplicationError(
        "Resume maximum 5 MB ka hona chahiye."
      );

      e.target.value = "";
      return;
    }

    setApplicationError("");

    const reader = new FileReader();

    reader.onload = () => {
      setApplication((prev) => ({
        ...prev,
        resume: reader.result,
      }));

      setResumeFile(file);
    };

    reader.onerror = () => {
      setApplicationError(
        "Resume file read nahi ho paayi. Dobara try karo."
      );
    };

    reader.readAsDataURL(file);
  };

  const handleApplicationSubmit = async (e) => {
    e.preventDefault();

    setApplicationMessage("");
    setApplicationError("");

    if (!selectedJob?._id) {
      setApplicationError(
        "Job select nahi hui. Dobara try karo."
      );
      return;
    }

    if (user?.role === "admin") {
      setApplicationError("Admin accounts cannot apply for jobs.");
      return;
    }

    if (isJobExpired(selectedJob)) {
      setApplicationError(
        "Is job ki application deadline khatam ho chuki hai."
      );
      return;
    }

    if (isJobFull(selectedJob)) {
      setApplicationError("All vacancies for this job have been filled.");
      return;
    }

    const token =
      localStorage.getItem("joborbit_token");

    if (!token) {
      setShowAuth(true);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${API}/applications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            jobId: selectedJob._id,
            ...application,
          }),
        }
      );

      const data = await readResponse(response);

      setApplicationMessage(
        data.message ||
          "Your application has been submitted successfully!"
      );

      setApplication(emptyApplication);
      setResumeFile(null);
      await loadJobs();
    } catch (err) {
      setApplicationError(
        err.message ||
          "Application submit nahi ho paayi."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (status) => {
    if (status === "Shortlisted") {
      return {
        background: "#e8f8ef",
        color: "#237448",
      };
    }

    if (status === "Rejected") {
      return {
        background: "#fdecec",
        color: "#c62828",
      };
    }

    if (status === "Reviewed") {
      return {
        background: "#edf2ff",
        color: "#315ee8",
      };
    }

    return {
      background: "#fff7df",
      color: "#946200",
    };
  };

  if (showAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          background: "#f5f7fb",
          boxSizing: "border-box",
          overflowX: "hidden",
        }}
      >
        <Auth
          onLogin={handleLogin}
          onClose={() => setShowAuth(false)}
          adminMode={adminLogin}
        />
      </div>
    );
  }

  if (showAdmin && user?.role === "admin") {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          background: "#f5f7fb",
          boxSizing: "border-box",
        }}
      >
        <AdminDashboard
          onBack={() => setShowAdmin(false)}
        />
      </div>
    );
  }

  if (showSavedJobs) {
    const savedJobs = jobs.filter((job) =>
      savedJobIds.includes(
        String(job._id || job.id)
      )
    );

    return (
      <div className="app">
        <div
          style={{
            minHeight: "100vh",
            padding: "30px 16px",
            background: "#f5f7fb",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              maxWidth: "950px",
              margin: "0 auto",
            }}
          >
            <button
              type="button"
              onClick={() => setShowSavedJobs(false)}
              style={{
                padding: "9px 14px",
                border: "none",
                borderRadius: "8px",
                background: "#e9eefc",
                color: "#315ee8",
                cursor: "pointer",
                fontWeight: "600",
                marginBottom: "20px",
              }}
            >
              ← Back to Jobs
            </button>

            <div
              style={{
                background: "#ffffff",
                padding: "28px",
                borderRadius: "16px",
                boxShadow:
                  "0 5px 25px rgba(0,0,0,0.08)",
              }}
            >
              <h1
                style={{
                  margin: "0 0 6px",
                  color: "#17233b",
                }}
              >
                Saved Jobs ❤️
              </h1>

              <p
                style={{
                  margin: "0 0 25px",
                  color: "#66738b",
                }}
              >
                Jobs you saved for applying later.
              </p>

              {savedJobs.length === 0 ? (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    background: "#f7f9fc",
                    borderRadius: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "42px",
                      marginBottom: "10px",
                    }}
                  >
                    🤍
                  </div>

                  <h3
                    style={{
                      margin: "0 0 7px",
                      color: "#17233b",
                    }}
                  >
                    No saved jobs yet
                  </h3>

                  <p
                    style={{
                      color: "#66738b",
                      margin: 0,
                    }}
                  >
                    Save jobs from the Jobs page and
                    they will appear here.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "14px",
                  }}
                >
                  {savedJobs.map((job) => {
                    const expired = isJobExpired(job);
                    const full = isJobFull(job);

                    return (
                    <div
                      key={job._id || job.id}
                      style={{
                        border: "1px solid #e1e6ef",
                        borderRadius: "12px",
                        padding: "18px",
                        background: "#fff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "15px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            minWidth: 0,
                            flex: "1 1 250px",
                          }}
                        >
                          <h3
                            style={{
                              margin: "0 0 5px",
                              color: "#17233b",
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                              whiteSpace: "normal",
                            }}
                          >
                            {job.title}
                          </h3>

                          <p
                            style={{
                              margin: 0,
                              color: "#66738b",
                            }}
                          >
                            {job.company} ·{" "}
                            {job.location}
                          </p>
                        </div>

                        <strong
                          style={{
                            color: "#17233b",
                          }}
                        >
                          {job.salary ||
                            "Salary not specified"}
                        </strong>
                      </div>

                      {getJobSkills(job).length > 0 && (
                        <p
                          style={{
                            color: "#66738b",
                            margin: "12px 0",
                          }}
                        >
                          Skills:{" "}
                          {getJobSkills(job).join(", ")}
                        </p>
                      )}

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                          marginTop: "14px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setDetailsJob(job)
                          }
                          style={{
                            padding: "9px 13px",
                            border:
                              "1px solid #d6dce8",
                            borderRadius: "8px",
                            background: "#fff",
                            color: "#315ee8",
                            cursor: "pointer",
                            fontWeight: "600",
                          }}
                        >
                          View Details
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openApplication(job)
                          }
                          disabled={expired || full}
                          style={{
                            padding: "9px 13px",
                            border: "none",
                            borderRadius: "8px",
                            background:
                              expired || full
                                ? "#9ca3af"
                                : "#315ee8",
                            color: "#fff",
                            cursor:
                              expired || full
                                ? "not-allowed"
                                : "pointer",
                            fontWeight: "600",
                          }}
                        >
                          {expired
                            ? "Closed"
                            : full
                            ? "Filled"
                            : "Apply Now"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleSavedJob(job)
                          }
                          style={{
                            padding: "9px 13px",
                            border:
                              "1px solid #f0c8d0",
                            borderRadius: "8px",
                            background: "#fff5f7",
                            color: "#c62828",
                            cursor: "pointer",
                            fontWeight: "600",
                          }}
                        >
                          ♥ Remove
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showMyApplications) {
    return (
      <div className="app">
        <div
          style={{
            minHeight: "100vh",
            padding: "30px 16px",
            background: "#f5f7fb",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              maxWidth: "950px",
              margin: "0 auto",
            }}
          >
            <button
              type="button"
              onClick={() =>
                setShowMyApplications(false)
              }
              style={{
                padding: "9px 14px",
                border: "none",
                borderRadius: "8px",
                background: "#e9eefc",
                color: "#315ee8",
                cursor: "pointer",
                fontWeight: "600",
                marginBottom: "20px",
              }}
            >
              ← Back to Jobs
            </button>

            <div
              style={{
                background: "#ffffff",
                padding: "28px",
                borderRadius: "16px",
                boxShadow:
                  "0 5px 25px rgba(0,0,0,0.08)",
              }}
            >
              <h1
                style={{
                  margin: "0 0 6px",
                  color: "#17233b",
                }}
              >
                My Applications
              </h1>

              <p
                style={{
                  margin: "0 0 25px",
                  color: "#66738b",
                }}
              >
                Track all your job applications and
                their current status.
              </p>

              {myApplicationsLoading && (
                <p style={{ color: "#66738b" }}>
                  Loading your applications...
                </p>
              )}

              {myApplicationsError && (
                <div
                  style={{
                    padding: "15px",
                    background: "#fdecec",
                    color: "#c62828",
                    borderRadius: "10px",
                    marginBottom: "15px",
                  }}
                >
                  {myApplicationsError}
                </div>
              )}

              {!myApplicationsLoading &&
                !myApplicationsError &&
                myApplications.length === 0 && (
                  <div
                    style={{
                      padding: "35px 20px",
                      textAlign: "center",
                      background: "#f7f9fc",
                      borderRadius: "12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "40px",
                        marginBottom: "10px",
                      }}
                    >
                      📄
                    </div>

                    <h3
                      style={{
                        margin: "0 0 7px",
                        color: "#17233b",
                      }}
                    >
                      No applications yet
                    </h3>

                    <p
                      style={{
                        color: "#66738b",
                        margin: 0,
                      }}
                    >
                      Apply for a job and your
                      application will appear here.
                    </p>
                  </div>
                )}

              <div
                style={{
                  display: "grid",
                  gap: "15px",
                }}
              >
                {myApplications.map((item) => {
                  const job = item.job || {};
                  const statusStyle =
                    getStatusStyle(item.status);

                  return (
                    <div
                      key={item._id}
                      style={{
                        border:
                          "1px solid #e1e6ef",
                        borderRadius: "12px",
                        padding: "20px",
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: "15px",
                          alignItems:
                            "flex-start",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            minWidth: 0,
                            flex: "1 1 250px",
                          }}
                        >
                          <h2
                            style={{
                              margin: "0 0 5px",
                              color: "#17233b",
                              fontSize: "20px",
                              lineHeight: "1.35",
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                              whiteSpace: "normal",
                            }}
                          >
                            {job.title || "Job"}
                          </h2>

                          <p
                            style={{
                              margin: 0,
                              color: "#66738b",
                            }}
                          >
                            {job.company ||
                              "Company not specified"}
                          </p>
                        </div>

                        <span
                          style={{
                            padding: "7px 12px",
                            borderRadius: "20px",
                            fontSize: "13px",
                            fontWeight: "700",
                            ...statusStyle,
                            flexShrink: 0,
                          }}
                        >
                          {item.status || "Pending"}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: "10px",
                          marginTop: "18px",
                        }}
                      >
                        <div
                          style={{
                            padding: "12px",
                            background:
                              "#f7f9fc",
                            borderRadius: "8px",
                          }}
                        >
                          <small
                            style={{
                              color: "#66738b",
                            }}
                          >
                            Location
                          </small>

                          <strong
                            style={{
                              display: "block",
                              marginTop: "3px",
                            }}
                          >
                            {job.location ||
                              "Not specified"}
                          </strong>
                        </div>

                        <div
                          style={{
                            padding: "12px",
                            background:
                              "#f7f9fc",
                            borderRadius: "8px",
                          }}
                        >
                          <small
                            style={{
                              color: "#66738b",
                            }}
                          >
                            Applied On
                          </small>

                          <strong
                            style={{
                              display: "block",
                              marginTop: "3px",
                            }}
                          >
                            {item.createdAt
                              ? new Date(
                                  item.createdAt
                                ).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )
                              : "Date unavailable"}
                          </strong>
                        </div>

                        <div
                          style={{
                            padding: "12px",
                            background:
                              "#f7f9fc",
                            borderRadius: "8px",
                          }}
                        >
                          <small
                            style={{
                              color: "#66738b",
                            }}
                          >
                            Job Type
                          </small>

                          <strong
                            style={{
                              display: "block",
                              marginTop: "3px",
                            }}
                          >
                            {job.type ||
                              "Not specified"}
                          </strong>
                        </div>

                        <div
                          style={{
                            padding: "12px",
                            background:
                              "#f7f9fc",
                            borderRadius: "8px",
                          }}
                        >
                          <small
                            style={{
                              color: "#66738b",
                            }}
                          >
                            Salary
                          </small>

                          <strong
                            style={{
                              display: "block",
                              marginTop: "3px",
                            }}
                          >
                            {job.salary ||
                              "Not specified"}
                          </strong>
                        </div>
                      </div>

                      <details
                        style={{
                          marginTop: "16px",
                          borderTop:
                            "1px solid #e5e9f2",
                          paddingTop: "14px",
                        }}
                      >
                        <summary
                          style={{
                            cursor: "pointer",
                            color: "#315ee8",
                            fontWeight: "600",
                          }}
                        >
                          View Application Details
                        </summary>

                        <div
                          style={{
                            marginTop: "15px",
                            display: "grid",
                            gap: "10px",
                            color: "#42506a",
                          }}
                        >
                          <div>
                            <strong>
                              Applicant:
                            </strong>{" "}
                            {item.applicantName ||
                              "Not provided"}
                          </div>

                          <div>
                            <strong>
                              Email:
                            </strong>{" "}
                            {item.applicantEmail ||
                              "Not provided"}
                          </div>

                          <div>
                            <strong>
                              Phone:
                            </strong>{" "}
                            {item.phone ||
                              "Not provided"}
                          </div>

                          <div>
                            <strong>
                              Resume:
                            </strong>{" "}
                            {item.resume ? (
                              <a
                                href={item.resume}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color:
                                    "#315ee8",
                                }}
                              >
                                View Resume
                              </a>
                            ) : (
                              "Not provided"
                            )}
                          </div>

                          <div>
                            <strong>
                              Cover Letter:
                            </strong>

                            <p
                              style={{
                                margin:
                                  "5px 0 0",
                                color:
                                  "#66738b",
                                whiteSpace:
                                  "pre-wrap",
                              }}
                            >
                              {item.coverLetter ||
                                "No cover letter provided."}
                            </p>
                          </div>
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (
    showPostJob &&
    user?.role === "admin"
  ) {
    return (
      <div className="app">
        <PostJob
          onJobPosted={() => {
            setShowPostJob(false);
            loadJobs();
          }}
          onCancel={() =>
            setShowPostJob(false)
          }
        />
      </div>
    );
  }

    if (detailsJob) {
    const expired = isJobExpired(detailsJob);
    const full = isJobFull(detailsJob);
    const jobId =
      detailsJob._id || detailsJob.id;
    const saved = isJobSaved(jobId);

    return (
      <div className="app">
        <div
          style={{
            minHeight: "100vh",
            padding: "30px 16px 50px",
            background: "#f5f7fb",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
            }}
          >
            <button
              type="button"
              onClick={() =>
                setDetailsJob(null)
              }
              style={{
                padding: "10px 15px",
                border:
                  "1px solid #d6dce8",
                borderRadius: "9px",
                background: "#fff",
                color: "#315ee8",
                cursor: "pointer",
                fontWeight: "700",
                marginBottom: "18px",
              }}
            >
              ← Back to Jobs
            </button>

            <div
              style={{
                background: "#fff",
                borderRadius: "18px",
                boxShadow:
                  "0 8px 30px rgba(23,35,59,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "28px",
                  background:
                    "linear-gradient(135deg, #eef3ff 0%, #ffffff 70%)",
                  borderBottom:
                    "1px solid #e7ebf3",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    gap: "20px",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      alignItems:
                        "center",
                      minWidth: 0,
                      flex: "1 1 400px",
                    }}
                  >
                    <div
                      style={{
                        width: "68px",
                        height: "68px",
                        borderRadius: "16px",
                        background:
                          "#315ee8",
                        color: "#fff",
                        display: "grid",
                        placeItems:
                          "center",
                        fontSize: "28px",
                        fontWeight: "800",
                        flexShrink: 0,
                      }}
                    >
                      {(
                        detailsJob.company ||
                        detailsJob.title ||
                        "J"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <h1
                        style={{
                          margin: 0,
                          color:
                            "#17233b",
                          fontSize:
                            "clamp(24px, 5vw, 30px)",
                          lineHeight:
                            "1.25",
                          overflowWrap:
                            "anywhere",
                          wordBreak:
                            "break-word",
                          whiteSpace:
                            "normal",
                        }}
                      >
                        {detailsJob.title ||
                          "Job Position"}
                      </h1>

                      <p
                        style={{
                          margin:
                            "7px 0 0",
                          color:
                            "#66738b",
                          fontSize:
                            "16px",
                          overflowWrap:
                            "anywhere",
                          wordBreak:
                            "break-word",
                        }}
                      >
                        {detailsJob.company ||
                          "Company not specified"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      toggleSavedJob(
                        detailsJob
                      )
                    }
                    style={{
                      padding:
                        "10px 15px",
                      border:
                        "1px solid #d6dce8",
                      borderRadius:
                        "9px",
                      background:
                        saved
                          ? "#fff0f3"
                          : "#fff",
                      color:
                        saved
                          ? "#c62828"
                          : "#315ee8",
                      cursor:
                        "pointer",
                      fontWeight:
                        "700",
                      flexShrink: 0,
                    }}
                  >
                    {saved
                      ? "♥ Saved"
                      : "♡ Save Job"}
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "9px",
                    flexWrap: "wrap",
                    marginTop:
                      "22px",
                  }}
                >
                  <span
                    style={{
                      padding:
                        "8px 12px",
                      background:
                        "#e9efff",
                      color:
                        "#315ee8",
                      borderRadius:
                        "8px",
                      fontWeight:
                        "700",
                      fontSize:
                        "14px",
                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    📍{" "}
                    {detailsJob.location ||
                      "Location not specified"}
                  </span>

                  <span
                    style={{
                      padding:
                        "8px 12px",
                      background:
                        "#eef8f2",
                      color:
                        "#237448",
                      borderRadius:
                        "8px",
                      fontWeight:
                        "700",
                      fontSize:
                        "14px",
                    }}
                  >
                    💼{" "}
                    {detailsJob.type ||
                      "Job"}
                  </span>

                  <span
                    style={{
                      padding:
                        "8px 12px",
                      background:
                        "#fff6df",
                      color:
                        "#946200",
                      borderRadius:
                        "8px",
                      fontWeight:
                        "700",
                      fontSize:
                        "14px",
                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    💰{" "}
                    {detailsJob.salary ||
                      "Salary not specified"}
                  </span>

                  {detailsJob.deadline && (
                    <span
                      style={{
                        padding:
                          "8px 12px",
                        background:
                          expired
                            ? "#fff0f0"
                            : "#f3f4f6",
                        color:
                          expired
                            ? "#c62828"
                            : "#4b5563",
                        borderRadius:
                          "8px",
                        fontWeight:
                          "700",
                        fontSize:
                          "14px",
                      }}
                    >
                      📅{" "}
                      {expired
                        ? "Applications Closed"
                        : `Apply till ${formatDeadline(
                            detailsJob.deadline
                          )}`}
                    </span>
                  )}
                </div>
              </div>

              <div
                style={{
                  padding: "28px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                    marginBottom:
                      "30px",
                  }}
                >
                  {[
                    [
                      "Company",
                      detailsJob.company ||
                        "Not specified",
                    ],
                    [
                      "Location",
                      detailsJob.location ||
                        "Not specified",
                    ],
                    [
                      "Job Type",
                      detailsJob.type ||
                        "Not specified",
                    ],
                    [
                      "Salary",
                      detailsJob.salary ||
                        "Not specified",
                    ],
                    [
                      "Vacancies",
                      detailsJob.vacancies ||
                        "Not specified",
                    ],
                    [
                      "Applications",
                      detailsJob.appliedCount || 0,
                    ],
                    [
                      "Deadline",
                      formatDeadline(
                        detailsJob.deadline
                      ),
                    ],
                  ].map(
                    ([label, value]) => (
                      <div
                        key={label}
                        style={{
                          padding:
                            "15px",
                          background:
                            "#f7f9fc",
                          border:
                            "1px solid #e7ebf3",
                          borderRadius:
                            "11px",
                          minWidth: 0,
                        }}
                      >
                        <small
                          style={{
                            color:
                              "#66738b",
                          }}
                        >
                          {label}
                        </small>

                        <strong
                          style={{
                            display:
                              "block",
                            marginTop:
                              "5px",
                            color:
                              "#17233b",
                            overflowWrap:
                              "anywhere",
                            wordBreak:
                              "break-word",
                          }}
                        >
                          {value}
                        </strong>
                      </div>
                    )
                  )}
                </div>

                <h2
                  style={{
                    color:
                      "#17233b",
                    margin:
                      "0 0 12px",
                  }}
                >
                  Job Description
                </h2>

                <p
                  style={{
                    color:
                      "#5f6d84",
                    lineHeight:
                      "1.75",
                    whiteSpace:
                      "pre-wrap",
                    marginTop: 0,
                  }}
                >
                  {detailsJob.description ||
                    "The employer has not added a detailed job description yet."}
                </p>

                <h2
                  style={{
                    color:
                      "#17233b",
                    margin:
                      "28px 0 12px",
                  }}
                >
                  Required Skills
                </h2>

                {getJobSkills(
                  detailsJob
                ).length > 0 ? (
                  <div
                    style={{
                      display:
                        "flex",
                      gap: "8px",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    {getJobSkills(
                      detailsJob
                    ).map(
                      (
                        skill,
                        index
                      ) => (
                        <span
                          key={
                            index
                          }
                          style={{
                            padding:
                              "8px 12px",
                            borderRadius:
                              "8px",
                            background:
                              "#f5f7fb",
                            border:
                              "1px solid #dfe4ee",
                            color:
                              "#42506a",
                            fontSize:
                              "14px",
                            fontWeight:
                              "600",
                          }}
                        >
                          {skill}
                        </span>
                      )
                    )}
                  </div>
                ) : (
                  <p
                    style={{
                      color:
                        "#66738b",
                    }}
                  >
                    Skills not specified.
                  </p>
                )}

                <div
                  style={{
                    display:
                      "flex",
                    gap: "10px",
                    marginTop:
                      "32px",
                    flexWrap:
                      "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      toggleSavedJob(
                        detailsJob
                      )
                    }
                    style={{
                      flex:
                        "1 1 180px",
                      padding:
                        "14px",
                      border:
                        "1px solid #315ee8",
                      borderRadius:
                        "9px",
                      background:
                        saved
                          ? "#fff0f3"
                          : "#fff",
                      color:
                        saved
                          ? "#c62828"
                          : "#315ee8",
                      fontSize:
                        "16px",
                      fontWeight:
                        "700",
                      cursor:
                        "pointer",
                    }}
                  >
                    {saved
                      ? "♥ Saved Job"
                      : "♡ Save Job"}
                  </button>

                  {expired || full ? (
                    <button
                      type="button"
                      disabled
                      style={{
                        flex:
                          "2 1 280px",
                        padding:
                          "14px",
                        border: "none",
                        borderRadius:
                          "9px",
                        background:
                          "#9ca3af",
                        color:
                          "#fff",
                        fontSize:
                          "16px",
                        fontWeight:
                          "700",
                        cursor:
                          "not-allowed",
                      }}
                    >
                      {expired
                        ? "Applications Closed"
                        : "Vacancies Filled"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        openApplication(
                          detailsJob
                        )
                      }
                      style={{
                        flex:
                          "2 1 280px",
                        padding:
                          "14px",
                        border: "none",
                        borderRadius:
                          "9px",
                        background:
                          "#315ee8",
                        color:
                          "#fff",
                        fontSize:
                          "16px",
                        fontWeight:
                          "700",
                        cursor:
                          "pointer",
                      }}
                    >
                      🚀 Apply Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * APPLICATION FORM
   * ============================================================
   */

  if (selectedJob) {
    return (
      <div className="app">
        <div
          style={{
            minHeight: "100vh",
            padding: "30px 16px 50px",
            background: "#f5f7fb",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              maxWidth: "800px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            <button
              type="button"
              onClick={() =>
                setSelectedJob(null)
              }
              style={{
                padding: "10px 15px",
                border:
                  "1px solid #d6dce8",
                borderRadius: "9px",
                background: "#fff",
                color: "#315ee8",
                cursor: "pointer",
                fontWeight: "700",
                marginBottom: "18px",
              }}
            >
              ← Back
            </button>

            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                padding: "28px",
                boxShadow:
                  "0 8px 30px rgba(23,35,59,0.08)",
                boxSizing: "border-box",
                width: "100%",
                overflow: "hidden",
              }}
            >

              {/* =========================
                  FIXED JOB TITLE SECTION
              ========================= */}

              <div
                style={{
                  width: "100%",
                  minWidth: 0,
                  marginBottom: "25px",
                }}
              >
                <h1
                  style={{
                    margin: "0 0 8px",
                    color: "#17233b",
                    fontSize:
                      "clamp(24px, 5vw, 32px)",
                    lineHeight: "1.3",
                    fontWeight: "800",

                    /* IMPORTANT FIX */
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    whiteSpace: "normal",

                    maxWidth: "100%",
                  }}
                >
                  Apply for{" "}
                  <span
                    style={{
                      overflowWrap:
                        "anywhere",
                      wordBreak:
                        "break-word",
                      whiteSpace:
                        "normal",
                    }}
                  >
                    {selectedJob.title}
                  </span>
                </h1>

                <p
                  style={{
                    margin: 0,
                    color: "#66738b",
                    fontSize: "15px",
                    lineHeight: "1.5",
                    overflowWrap:
                      "anywhere",
                    wordBreak:
                      "break-word",
                    whiteSpace:
                      "normal",
                  }}
                >
                  {selectedJob.company} ·{" "}
                  {selectedJob.location}
                </p>
              </div>

              {applicationMessage && (
                <div
                  style={{
                    padding: "14px",
                    marginBottom: "15px",
                    borderRadius: "10px",
                    background: "#e8f8ef",
                    color: "#237448",
                    fontWeight: "600",
                  }}
                >
                  {applicationMessage}
                </div>
              )}

              {applicationError && (
                <div
                  style={{
                    padding: "14px",
                    marginBottom: "15px",
                    borderRadius: "10px",
                    background: "#fdecec",
                    color: "#c62828",
                    fontWeight: "600",
                  }}
                >
                  {applicationError}
                </div>
              )}

              <form
                onSubmit={
                  handleApplicationSubmit
                }
                style={{
                  display: "grid",
                  gap: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      fontWeight: "600",
                      color: "#17233b",
                    }}
                  >
                    Full Name
                  </label>

                  <input
                    style={inputStyle}
                    name="applicantName"
                    value={
                      application.applicantName
                    }
                    onChange={
                      handleApplicationChange
                    }
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      fontWeight: "600",
                      color: "#17233b",
                    }}
                  >
                    Email
                  </label>

                  <input
                    style={inputStyle}
                    type="email"
                    name="applicantEmail"
                    value={
                      application.applicantEmail
                    }
                    onChange={
                      handleApplicationChange
                    }
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      fontWeight: "600",
                      color: "#17233b",
                    }}
                  >
                    Phone
                  </label>

                  <input
                    style={inputStyle}
                    name="phone"
                    value={
                      application.phone
                    }
                    onChange={
                      handleApplicationChange
                    }
                    placeholder="Enter your phone number"
                    required
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      fontWeight: "600",
                      color: "#17233b",
                    }}
                  >
                    Resume
                  </label>

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={
                      handleResumeFileChange
                    }
                  />

                  {resumeFile && (
                    <p
                      style={{
                        margin:
                          "7px 0 0",
                        color:
                          "#237448",
                        fontSize:
                          "14px",
                        overflowWrap:
                          "anywhere",
                        wordBreak:
                          "break-word",
                      }}
                    >
                      Selected:{" "}
                      {
                        resumeFile.name
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      fontWeight: "600",
                      color: "#17233b",
                    }}
                  >
                    Cover Letter
                  </label>

                  <textarea
                    style={{
                      ...inputStyle,
                      minHeight: "130px",
                      resize: "vertical",
                    }}
                    name="coverLetter"
                    value={
                      application.coverLetter
                    }
                    onChange={
                      handleApplicationChange
                    }
                    placeholder="Write a short cover letter..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "14px",
                    border: "none",
                    borderRadius: "9px",
                    background:
                      submitting
                        ? "#9ca3af"
                        : "#315ee8",
                    color: "#fff",
                    fontSize: "16px",
                    fontWeight: "700",
                    cursor:
                      submitting
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Application"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">

      <header className="navbar">
        <h2>
          Job<span>Orbit</span>.
        </h2>

        <nav>
          <a href="#jobs">
            Find Jobs
          </a>

          <a href="#about">
            About
          </a>

          {!user ? (
            <>
              <button
                className="login"
                onClick={() => {
                  setAdminLogin(false);
                  setShowAuth(true);
                }}
              >
                Login / Signup
              </button>

              <button
                className="login"
                onClick={() => {
                  setAdminLogin(true);
                  setShowAuth(true);
                }}
              >
                Admin Login
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: "8px",
                  padding:
                    "7px 12px",
                  borderRadius:
                    "20px",
                  background:
                    "#edf2ff",
                  color:
                    "#315ee8",
                  fontWeight:
                    "600",
                  fontSize:
                    "14px",
                  minWidth: 0,
                  maxWidth:
                    "100%",
                }}
              >
                <span
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius:
                      "50%",
                    background:
                      "#315ee8",
                    color:
                      "#fff",
                    display:
                      "grid",
                    placeItems:
                      "center",
                    fontSize:
                      "13px",
                    fontWeight:
                      "700",
                    flexShrink: 0,
                  }}
                >
                  {(
                    user.name ||
                    user.email ||
                    "U"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </span>

                <span
                  style={{
                    overflowWrap:
                      "anywhere",
                    wordBreak:
                      "break-word",
                  }}
                >
                  {user.name ||
                    user.email}
                </span>
              </div>

              {user.role !==
                "admin" && (
                <>
                  <button
                    className="login"
                    onClick={() =>
                      setShowSavedJobs(
                        true
                      )
                    }
                  >
                    Saved Jobs ❤️ (
                    {
                      savedJobIds.length
                    }
                    )
                  </button>

                  <button
                    className="login"
                    onClick={
                      loadMyApplications
                    }
                  >
                    My Applications
                  </button>
                </>
              )}

              {user.role ===
                "admin" && (
                <>
                  <button
                    className="login"
                    onClick={() =>
                      setShowAdmin(
                        true
                      )
                    }
                  >
                    Admin Dashboard
                  </button>

                  <button
                    className="post"
                    onClick={() =>
                      setShowPostJob(
                        true
                      )
                    }
                  >
                    Post a Job
                  </button>
                </>
              )}

              <button
                className="login"
                onClick={
                  handleLogout
                }
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </header>

      <section className="hero">
        <p className="tagline">
          Your career starts here
        </p>

        <h1>
          Find Your{" "}
          <span>Dream Job</span>
        </h1>

        <p>
          Discover opportunities and take
          the next step in your career.
        </p>

        <div className="search">
          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search job, company or location..."
          />

          <button
            type="button"
            onClick={() =>
              document
                .getElementById(
                  "jobs"
                )
                ?.scrollIntoView({
                  behavior:
                    "smooth",
                })
            }
          >
            Search
          </button>
        </div>
      </section>

      <main
        id="jobs"
        className="jobs"
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-end",
            gap: "20px",
            flexWrap:
              "wrap",
            marginBottom:
              "18px",
          }}
        >
          <div>
            <h2
              style={{
                marginBottom:
                  "5px",
              }}
            >
              Featured Jobs
            </h2>

            <p
              style={{
                margin: 0,
              }}
            >
              Explore opportunities for your career
            </p>
          </div>

          {!loading &&
            !error && (
              <div
                style={{
                  padding:
                    "9px 14px",
                  borderRadius:
                    "20px",
                  background:
                    "#edf2ff",
                  color:
                    "#315ee8",
                  fontWeight:
                    "700",
                  fontSize:
                    "14px",
                }}
              >
                {filteredJobs.length}{" "}
                {filteredJobs.length ===
                1
                  ? "Job"
                  : "Jobs"}{" "}
                Found
              </div>
            )}
        </div>

        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e2e7f0",
            borderRadius:
              "16px",
            padding:
              "20px",
            marginBottom:
              "24px",
            boxShadow:
              "0 5px 20px rgba(23,35,59,0.05)",
          }}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: "15px",
              flexWrap:
                "wrap",
              marginBottom:
                "16px",
            }}
          >
            <div>
              <h3
                style={{
                  margin:
                    "0 0 4px",
                  color:
                    "#17233b",
                }}
              >
                🔎 Advanced Job Search
              </h3>

              <p
                style={{
                  margin: 0,
                  color:
                    "#66738b",
                  fontSize:
                    "14px",
                }}
              >
                Filter jobs by location, type, salary and skills.
              </p>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                style={{
                  padding:
                    "9px 14px",
                  border:
                    "1px solid #f0c8d0",
                  borderRadius:
                    "8px",
                  background:
                    "#fff5f7",
                  color:
                    "#c62828",
                  cursor:
                    "pointer",
                  fontWeight:
                    "700",
                }}
              >
                ✕ Clear Filters
              </button>
            )}
          </div>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label
                style={{
                  display:
                    "block",
                  marginBottom:
                    "6px",
                  color:
                    "#42506a",
                  fontSize:
                    "13px",
                  fontWeight:
                    "700",
                }}
              >
                📍 Location
              </label>

              <select
                value={
                  locationFilter
                }
                onChange={(e) =>
                  setLocationFilter(
                    e.target.value
                  )
                }
                style={{
                  ...inputStyle,
                  background:
                    "#fff",
                  cursor:
                    "pointer",
                }}
              >
                <option value="">
                  All Locations
                </option>

                {locationOptions.map(
                  (location) => (
                    <option
                      key={
                        location
                      }
                      value={
                        location
                      }
                    >
                      {location}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                style={{
                  display:
                    "block",
                  marginBottom:
                    "6px",
                  color:
                    "#42506a",
                  fontSize:
                    "13px",
                  fontWeight:
                    "700",
                }}
              >
                💼 Job Type
              </label>

              <select
                value={
                  jobTypeFilter
                }
                onChange={(e) =>
                  setJobTypeFilter(
                    e.target.value
                  )
                }
                style={{
                  ...inputStyle,
                  background:
                    "#fff",
                  cursor:
                    "pointer",
                }}
              >
                <option value="">
                  All Job Types
                </option>

                {jobTypeOptions.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                style={{
                  display:
                    "block",
                  marginBottom:
                    "6px",
                  color:
                    "#42506a",
                  fontSize:
                    "13px",
                  fontWeight:
                    "700",
                }}
              >
                💰 Minimum Salary
              </label>

              <select
                value={
                  salaryFilter
                }
                onChange={(e) =>
                  setSalaryFilter(
                    e.target.value
                  )
                }
                style={{
                  ...inputStyle,
                  background:
                    "#fff",
                  cursor:
                    "pointer",
                }}
              >
                <option value="">
                  Any Salary
                </option>

                <option value="15000">
                  ₹15,000+
                </option>

                <option value="20000">
                  ₹20,000+
                </option>

                <option value="30000">
                  ₹30,000+
                </option>

                <option value="50000">
                  ₹50,000+
                </option>

                <option value="100000">
                  ₹1 Lakh+
                </option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display:
                    "block",
                  marginBottom:
                    "6px",
                  color:
                    "#42506a",
                  fontSize:
                    "13px",
                  fontWeight:
                    "700",
                }}
              >
                🛠️ Skill
              </label>

              <select
                value={
                  skillFilter
                }
                onChange={(e) =>
                  setSkillFilter(
                    e.target.value
                  )
                }
                style={{
                  ...inputStyle,
                  background:
                    "#fff",
                  cursor:
                    "pointer",
                }}
              >
                <option value="">
                  All Skills
                </option>

                {skillOptions.map(
                  (skill) => (
                    <option
                      key={skill}
                      value={skill}
                    >
                      {skill}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                style={{
                  display:
                    "block",
                  marginBottom:
                    "6px",
                  color:
                    "#42506a",
                  fontSize:
                    "13px",
                  fontWeight:
                    "700",
                }}
              >
                📅 Application Status
              </label>

              <select
                value={
                  statusFilter
                }
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
                style={{
                  ...inputStyle,
                  background:
                    "#fff",
                  cursor:
                    "pointer",
                }}
              >
                <option value="all">
                  All Jobs
                </option>

                <option value="active">
                  Active Jobs
                </option>

                <option value="expired">
                  Expired Jobs
                </option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div
              style={{
                marginTop:
                  "16px",
                padding:
                  "12px 14px",
                background:
                  "#f7f9fc",
                borderRadius:
                  "10px",
                display:
                  "flex",
                gap: "8px",
                alignItems:
                  "center",
                flexWrap:
                  "wrap",
                fontSize:
                  "13px",
              }}
            >
              <strong
                style={{
                  color:
                    "#42506a",
                }}
              >
                Active filters:
              </strong>

              {search && (
                <span
                  style={{
                    padding:
                      "5px 9px",
                    borderRadius:
                      "15px",
                    background:
                      "#e9efff",
                    color:
                      "#315ee8",
                  }}
                >
                  Search:{" "}
                  {search}
                </span>
              )}

              {locationFilter && (
                <span
                  style={{
                    padding:
                      "5px 9px",
                    borderRadius:
                      "15px",
                    background:
                      "#e9efff",
                    color:
                      "#315ee8",
                  }}
                >
                  📍{" "}
                  {locationFilter}
                </span>
              )}

              {jobTypeFilter && (
                <span
                  style={{
                    padding:
                      "5px 9px",
                    borderRadius:
                      "15px",
                    background:
                      "#e8f8ef",
                    color:
                      "#237448",
                  }}
                >
                  💼{" "}
                  {jobTypeFilter}
                </span>
              )}

              {salaryFilter && (
                <span
                  style={{
                    padding:
                      "5px 9px",
                    borderRadius:
                      "15px",
                    background:
                      "#fff6df",
                    color:
                      "#946200",
                  }}
                >
                  💰 ₹
                  {Number(
                    salaryFilter
                  ).toLocaleString(
                    "en-IN"
                  )}
                  +
                </span>
              )}

              {skillFilter && (
                <span
                  style={{
                    padding:
                      "5px 9px",
                    borderRadius:
                      "15px",
                    background:
                      "#f1ecff",
                    color:
                      "#7048b8",
                  }}
                >
                  🛠️{" "}
                  {skillFilter}
                </span>
              )}

              {statusFilter !==
                "all" && (
                <span
                  style={{
                    padding:
                      "5px 9px",
                    borderRadius:
                      "15px",
                    background:
                      statusFilter ===
                      "active"
                        ? "#e8f8ef"
                        : "#fdecec",
                    color:
                      statusFilter ===
                      "active"
                        ? "#237448"
                        : "#c62828",
                  }}
                >
                  {statusFilter ===
                  "active"
                    ? "🟢 Active"
                    : "🔴 Expired"}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="job-list">
          {loading && (
            <p>
              Loading jobs...
            </p>
          )}

          {error && (
            <div
              style={{
                padding:
                  "20px",
                background:
                  "#fdecec",
                borderRadius:
                  "12px",
                color:
                  "#c62828",
              }}
            >
              <p>
                {error}
              </p>

              <button
                type="button"
                onClick={
                  loadJobs
                }
                style={{
                  padding:
                    "9px 14px",
                  border:
                    "none",
                  borderRadius:
                    "8px",
                  background:
                    "#315ee8",
                  color:
                    "#fff",
                  cursor:
                    "pointer",
                  fontWeight:
                    "700",
                }}
              >
                Try Again
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            filteredJobs.map(
              (job) => {
                const jobId =
                  job._id ||
                  job.id;

                const saved =
                  isJobSaved(
                    jobId
                  );

                const expired =
                  isJobExpired(
                    job
                  );

                const full =
                  isJobFull(job);

                return (
                  <article
                    className="job-card"
                    key={jobId}
                  >
                    <div
                      style={{
                        minWidth: 0,
                        flex: "1 1 auto",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "flex-start",
                          justifyContent:
                            "space-between",
                          gap: "15px",
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <div
                          style={{
                            minWidth: 0,
                            flex: "1 1 250px",
                          }}
                        >
                          <h3
                            style={{
                              overflowWrap:
                                "anywhere",
                              wordBreak:
                                "break-word",
                              whiteSpace:
                                "normal",
                            }}
                          >
                            {job.title}
                          </h3>

                          <p
                            style={{
                              overflowWrap:
                                "anywhere",
                              wordBreak:
                                "break-word",
                            }}
                          >
                            {job.company}{" "}
                            ·{" "}
                            {
                              job.location
                            }
                          </p>
                        </div>

                        {expired && (
                          <span
                            style={{
                              padding:
                                "6px 10px",
                              borderRadius:
                                "15px",
                              background:
                                "#fff0f0",
                              color:
                                "#c62828",
                              fontSize:
                                "12px",
                              fontWeight:
                                "700",
                              flexShrink: 0,
                            }}
                          >
                            Applications Closed
                          </span>
                        )}
                      </div>

                      {job.type && (
                        <span className="job-type">
                          {job.type}
                        </span>
                      )}

                      {getJobSkills(
                        job
                      ).length >
                        0 && (
                        <p>
                          <strong>
                            Skills:
                          </strong>{" "}
                          {getJobSkills(
                            job
                          ).join(
                            ", "
                          )}
                        </p>
                      )}

                      {job.description && (
                        <p
                          style={{
                            display:
                              "-webkit-box",
                            WebkitLineClamp:
                              2,
                            WebkitBoxOrient:
                              "vertical",
                            overflow:
                              "hidden",
                          }}
                        >
                          {
                            job.description
                          }
                        </p>
                      )}

                      {job.deadline && (
                        <p
                          style={{
                            margin:
                              "8px 0 0",
                            color:
                              expired
                                ? "#c62828"
                                : "#66738b",
                            fontSize:
                              "13px",
                            fontWeight:
                              expired
                                ? "600"
                                : "400",
                          }}
                        >
                          📅{" "}
                          {expired
                            ? "Application deadline passed"
                            : `Apply till ${formatDeadline(
                                job.deadline
                              )}`}
                        </p>
                      )}
                    </div>

                    <div
                      className="job-action"
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <strong
                        style={{
                          overflowWrap:
                            "anywhere",
                          wordBreak:
                            "break-word",
                        }}
                      >
                        {job.salary ||
                          "Salary not specified"}
                      </strong>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: "8px",
                          flexWrap:
                            "wrap",
                          justifyContent:
                            "flex-end",
                          marginTop:
                            "10px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            toggleSavedJob(
                              job
                            )
                          }
                          style={{
                            padding:
                              "9px 13px",
                            border:
                              "1px solid #d6dce8",
                            borderRadius:
                              "8px",
                            background:
                              saved
                                ? "#fff0f3"
                                : "#fff",
                            color:
                              saved
                                ? "#c62828"
                                : "#315ee8",
                            cursor:
                              "pointer",
                            fontWeight:
                              "600",
                          }}
                        >
                          {saved
                            ? "♥ Saved"
                            : "♡ Save"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDetailsJob(
                              job
                            )
                          }
                          style={{
                            padding:
                              "9px 13px",
                            border:
                              "1px solid #d6dce8",
                            borderRadius:
                              "8px",
                            background:
                              "#fff",
                            color:
                              "#315ee8",
                            cursor:
                              "pointer",
                            fontWeight:
                              "600",
                          }}
                        >
                          View Details
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openApplication(
                              job
                            )
                          }
                          disabled={
                            expired || full
                          }
                          style={{
                            padding:
                              "9px 13px",
                            border:
                              "none",
                            borderRadius:
                              "8px",
                            background:
                              expired || full
                                ? "#9ca3af"
                                : "#315ee8",
                            color:
                              "#fff",
                            cursor:
                              expired || full
                                ? "not-allowed"
                                : "pointer",
                            fontWeight:
                              "600",
                          }}
                        >
                          {expired
                            ? "Closed"
                            : full
                            ? "Filled"
                            : "Apply Now"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }
            )}

          {!loading &&
            !error &&
            filteredJobs.length ===
              0 && (
              <div
                style={{
                  padding:
                    "45px 20px",
                  textAlign:
                    "center",
                  background:
                    "#fff",
                  border:
                    "1px solid #e1e6ef",
                  borderRadius:
                    "14px",
                }}
              >
                <div
                  style={{
                    fontSize:
                      "45px",
                    marginBottom:
                      "10px",
                  }}
                >
                  🔍
                </div>

                <h3
                  style={{
                    margin:
                      "0 0 7px",
                    color:
                      "#17233b",
                  }}
                >
                  No jobs found
                </h3>

                <p
                  style={{
                    color:
                      "#66738b",
                    margin:
                      "0 0 16px",
                  }}
                >
                  Try changing your search or filters.
                </p>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    style={{
                      padding:
                        "10px 16px",
                      border:
                        "none",
                      borderRadius:
                        "8px",
                      background:
                        "#315ee8",
                      color:
                        "#fff",
                      cursor:
                        "pointer",
                      fontWeight:
                        "700",
                    }}
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
        </div>
      </main>

      <footer id="about">
        <h2>
          JobOrbit.
        </h2>

        <p>
          Connecting talent with opportunity.
        </p>

        <p>
          © 2026 JobOrbit
        </p>
      </footer>
    </div>
  );
}

export default App;