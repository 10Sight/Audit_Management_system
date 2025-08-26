import React, { useState } from "react";

const DynamicForm = ({ fields, onSubmit }) => {
  const [formData, setFormData] = useState(
    fields.reduce((acc, field) => {
      if (field.type === "checkbox") acc[field.name] = [];
      else acc[field.name] = "";
      return acc;
    }, {})
  );

  const handleChange = (e, field) => {
    const { name, value, type, checked } = e.target;

    // Checkbox handling
    if (type === "checkbox") {
      setFormData((prev) => {
        const newValues = checked
          ? [...prev[name], value]
          : prev[name].filter((val) => val !== value);
        return { ...prev, [name]: newValues };
      });
    } else {
      setFormData({ ...formData, [name]: value });

      // Call optional onChange callback for dynamic behavior
      if (field.onChange) field.onChange(value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      {fields.map((field, idx) => (
        <div key={idx} className="flex flex-col">
          <label className="mb-1 font-medium text-gray-300">{field.label}</label>

          {/* Text / Email / Password / Number */}
          {["text", "email", "password", "number"].includes(field.type) && (
            <input
              type={field.type}
              name={field.name}
              placeholder={field.placeholder}
              value={formData[field.name]}
              onChange={(e) => handleChange(e, field)}
              disabled={field.disabled}
              required={field.required}
              className="p-3 rounded-lg bg-black text-white border border-gray-700 focus:outline-none focus:border-white transition"
            />
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
              className="p-3 rounded-lg bg-black text-white border border-gray-700 focus:outline-none focus:border-white transition"
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
              className="p-3 rounded-lg bg-black text-white border border-gray-700 focus:outline-none focus:border-white transition"
            >
              <option value="">Select {field.label}</option>
              {field.options?.map((opt, i) => (
                <option key={i} value={opt} className="bg-black text-white">
                  {opt}
                </option>
              ))}
            </select>
          )}

          {/* Radio Buttons */}
          {field.type === "radio" && (
            <div className="flex gap-4">
              {field.options?.map((opt, i) => (
                <label key={i} className="flex items-center gap-2 text-gray-300">
                  <input
                    type="radio"
                    name={field.name}
                    value={opt}
                    checked={formData[field.name] === opt}
                    onChange={(e) => handleChange(e, field)}
                    disabled={field.disabled}
                    required={field.required}
                    className="accent-white"
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
                <label key={i} className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    name={field.name}
                    value={opt}
                    checked={formData[field.name].includes(opt)}
                    onChange={(e) => handleChange(e, field)}
                    disabled={field.disabled}
                    className="accent-white"
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-white text-black px-4 py-3 mt-4 rounded-lg hover:bg-gray-200 transition font-medium shadow-md"
      >
        Submit
      </button>
    </form>
  );
};

export default DynamicForm;
