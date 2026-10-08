import { useState } from "react";
import { API } from "./api";

export default function PostJob({ onJobPosted, onCancel }) {
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    type: "Full-time",
    salary: "",
    skills: "",
    description: "",
    vacancies: "1",
    deadline: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("joborbit_token");

      if (!token) {
        throw new Error("Please login first");
      }

      if (!form.vacancies || Number(form.vacancies) < 1) {
        throw new Error("Vacancies kam se kam 1 honi chahiye");
      }

      if (!form.deadline) {
        throw new Error("Application deadline select karo");
      }

      const selectedDate = new Date(`${form.deadline}T23:59:59`);

      if (selectedDate <= new Date()) {
        throw new Error("Deadline future ki date honi chahiye");
      }

      const response = await fetch(`${API}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title,
          company: form.company,
          location: form.location,
          type: form.type,
          salary: form.salary,

          skills: form.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean),

          description: form.description,

          vacancies: Number(form.vacancies),

          // Deadline ko poore din ke end tak open rakhenge
          deadline: `${form.deadline}T23:59:59`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Job post nahi ho payi");
      }

      setMessage("✅ Job successfully post ho gayi!");

      setForm({
        title: "",
        company: "",
        location: "",
        type: "Full-time",
        salary: "",
        skills: "",
        description: "",
        vacancies: "1",
        deadline: "",
      });

      if (onJobPosted) {
        onJobPosted();
      }
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    marginTop: "6px",
    marginBottom: "16px",
    border: "1px solid #d1d5db",
    borderRadius: "9px",
    boxSizing: "border-box",
    fontSize: "14px",
    outline: "none",
    background: "#fff",
  };

  const labelStyle = {
    fontWeight: "600",
    fontSize: "14px",
    color: "#374151",
  };

  // Aaj ki date YYYY-MM-DD format me
  const today = new Date().toISOString().split("T")[0];

  return (
    <div
      style={{
        maxWidth: "650px",
        margin: "30px auto",
        padding: "28px",
        background: "#fff",
        borderRadius: "16px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
      }}
    >
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: "28px",
          color: "#111827",
        }}
      >
        Post a Job
      </h2>

      <p
        style={{
          marginTop: 0,
          marginBottom: "25px",
          color: "#6b7280",
        }}
      >
        Create a new job opening and publish it on JobOrbit.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Job Title */}
        <label style={labelStyle}>Job Title</label>

        <input
          style={inputStyle}
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="e.g. React Developer"
          required
        />

        {/* Company */}
        <label style={labelStyle}>Company</label>

        <input
          style={inputStyle}
          name="company"
          value={form.company}
          onChange={handleChange}
          placeholder="e.g. TCS"
          required
        />

        {/* Location */}
        <label style={labelStyle}>Location</label>

        <input
          style={inputStyle}
          name="location"
          value={form.location}
          onChange={handleChange}
          placeholder="e.g. Prayagraj / Remote"
          required
        />

        {/* Job Type */}
        <label style={labelStyle}>Job Type</label>

        <select
          style={inputStyle}
          name="type"
          value={form.type}
          onChange={handleChange}
        >
          <option value="Full-time">Full-time</option>
          <option value="Internship">Internship</option>
          <option value="Part-time">Part-time</option>
          <option value="Contract">Contract</option>
        </select>

        {/* Salary */}
        <label style={labelStyle}>Salary</label>

        <input
          style={inputStyle}
          name="salary"
          value={form.salary}
          onChange={handleChange}
          placeholder="e.g. ₹15,000/month"
        />

        {/* Vacancies */}
        <label style={labelStyle}>Number of Vacancies</label>

        <input
          style={inputStyle}
          type="number"
          name="vacancies"
          value={form.vacancies}
          onChange={handleChange}
          placeholder="e.g. 5"
          min="1"
          required
        />

        {/* Deadline */}
        <label style={labelStyle}>Application Deadline</label>

        <input
          style={inputStyle}
          type="date"
          name="deadline"
          value={form.deadline}
          onChange={handleChange}
          min={today}
          required
        />

        <small
          style={{
            display: "block",
            marginTop: "-8px",
            marginBottom: "16px",
            color: "#6b7280",
          }}
        >
          Is date ke baad candidates apply nahi kar paayenge.
        </small>

        {/* Skills */}
        <label style={labelStyle}>Skills</label>

        <input
          style={inputStyle}
          name="skills"
          value={form.skills}
          onChange={handleChange}
          placeholder="React, JavaScript, Node.js, MongoDB"
        />

        <small
          style={{
            display: "block",
            marginTop: "-8px",
            marginBottom: "16px",
            color: "#6b7280",
          }}
        >
          Skills ko comma se separate karo.
        </small>

        {/* Description */}
        <label style={labelStyle}>Job Description</label>

        <textarea
          style={{
            ...inputStyle,
            resize: "vertical",
            minHeight: "120px",
          }}
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Job responsibilities, requirements, experience etc."
          rows="5"
          required
        />

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "5px",
          }}
        >
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 22px",
              background: loading ? "#9ca3af" : "#315ee8",
              color: "white",
              border: 0,
              borderRadius: "9px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "600",
            }}
          >
            {loading ? "Posting..." : "Publish Job"}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "12px 20px",
                background: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "9px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {message && (
        <div
          style={{
            marginTop: "18px",
            padding: "12px",
            borderRadius: "8px",
            background: "#f3f4f6",
            color: "#374151",
            fontSize: "14px",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}