import React, { useState } from "react";

const DynamicForm = ({ fields, onSubmit }) => {
  const [formData, setFormData] = useState(
    fields.reduce((acc, field) => {
      if (field.type === "checkbox") acc[field.name] = [];
      else acc[field.name] = "";
      return acc;
    }, {})
  );

  // Track show/hide for password fields individually
  const [showPassword, setShowPassword] = useState(
    fields.reduce((acc, field) => {
      if (field.type === "password") acc[field.name] = false;
      return acc;
    }, {})
  );

  const handleChange = (e, field) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFormData((prev) => {
        const newValues = checked
          ? [...prev[name], value]
          : prev[name].filter((val) => val !== value);
        return { ...prev, [name]: newValues };
      });
    } else {
      setFormData({ ...formData, [name]: value });
      if (field.onChange) field.onChange(value);
    }
  };

  const togglePassword = (name) => {
    setShowPassword((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      {fields.map((field, idx) => (
        <div key={idx} className="flex flex-col">
          <label className="mb-1 font-medium text-gray-700">{field.label}</label>

          {/* Text / Email / Number */}
          {["text", "email", "number"].includes(field.type) && (
            <input
              type={field.type}
              name={field.name}
              placeholder={field.placeholder}
              value={formData[field.name]}
              onChange={(e) => handleChange(e, field)}
              disabled={field.disabled}
              required={field.required}
              className="p-3 rounded-lg bg-gray-50 text-gray-900 border border-gray-300 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          )}

          {/* Password */}
          {field.type === "password" && (
            <div className="relative">
              <input
                type={showPassword[field.name] ? "text" : "password"}
                name={field.name}
                placeholder={field.placeholder}
                value={formData[field.name]}
                onChange={(e) => handleChange(e, field)}
                disabled={field.disabled}
                required={field.required}
                className="p-3 rounded-lg bg-gray-50 text-gray-900 border border-gray-300 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition w-full"
              />
              <button
                type="button"
                onClick={() => togglePassword(field.name)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"
              >
                {showPassword[field.name] ? "Hide" : "Show"}
              </button>
            </div>
          )}

          {/* Textarea */}
          {field.type === "textarea" && (
            <textarea
              name={field.name}
              placeholder={field.placeholder}
              value={formData[field.name]}
              onChange={(e) => handleChange(e, field)}
              disabled={field.disabled}
              required={field.required}
              className="p-3 rounded-lg bg-gray-50 text-gray-900 border border-gray-300 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          )}

          {/* Select Dropdown */}
          {field.type === "select" && (
            <select
              name={field.name}
              value={formData[field.name]}
              onChange={(e) => handleChange(e, field)}
              disabled={field.disabled}
              required={field.required}
              className="p-3 rounded-lg bg-gray-50 text-gray-900 border border-gray-300 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            >
              <option value="">Select {field.label}</option>
              {field.options?.map((opt, i) => (
                <option key={i} value={opt} className="bg-white text-gray-900">
                  {opt}
                </option>
              ))}
            </select>
          )}

          {/* Radio Buttons */}
          {field.type === "radio" && (
            <div className="flex gap-4">
              {field.options?.map((opt, i) => (
                <label key={i} className="flex items-center gap-2 text-gray-700">
                  <input
                    type="radio"
                    name={field.name}
                    value={opt}
                    checked={formData[field.name] === opt}
                    onChange={(e) => handleChange(e, field)}
                    disabled={field.disabled}
                    required={field.required}
                    className="accent-blue-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}

          {/* Checkboxes */}
          {field.type === "checkbox" && (
            <div className="flex gap-4 flex-wrap">
              {field.options?.map((opt, i) => (
                <label key={i} className="flex items-center gap-2 text-gray-700">
                  <input
                    type="checkbox"
                    name={field.name}
                    value={opt}
                    checked={formData[field.name].includes(opt)}
                    onChange={(e) => handleChange(e, field)}
                    disabled={field.disabled}
                    className="accent-blue-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      <button
        type="submit"
        className="w-full bg-blue-600 text-white px-4 py-3 mt-4 rounded-lg 
        hover:bg-blue-700 transition font-medium shadow-md"
      >
        Submit
      </button>
    </form>
  );
};

export default DynamicForm;
