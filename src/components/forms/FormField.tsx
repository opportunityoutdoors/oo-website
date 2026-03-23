interface BaseFieldProps {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  className?: string;
}

interface TextFieldProps extends BaseFieldProps {
  type: "text" | "email" | "tel" | "date";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface TextareaFieldProps extends BaseFieldProps {
  type: "textarea";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

interface SelectFieldProps extends BaseFieldProps {
  type: "select";
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
}

interface CheckboxGroupFieldProps extends BaseFieldProps {
  type: "checkbox-group";
  value: string[];
  onChange: (value: string[]) => void;
  options: { label: string; value: string }[];
}

interface RadioFieldProps extends BaseFieldProps {
  type: "radio";
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}

interface CheckboxFieldProps extends BaseFieldProps {
  type: "checkbox";
  checked: boolean;
  onChange: (checked: boolean) => void;
}

type FormFieldProps =
  | TextFieldProps
  | TextareaFieldProps
  | SelectFieldProps
  | CheckboxGroupFieldProps
  | RadioFieldProps
  | CheckboxFieldProps;

const inputClasses =
  "w-full rounded border border-near-black/20 bg-white px-4 py-3 text-sm text-near-black placeholder:text-near-black/40 focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green";

export default function FormField(props: FormFieldProps) {
  const { label, name, required, error, className = "", type } = props;

  return (
    <div className={className}>
      {type !== "checkbox" && (
        <label
          htmlFor={name}
          className="mb-1.5 block text-sm font-semibold text-near-black"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      {(type === "text" || type === "email" || type === "tel" || type === "date") && (
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          value={(props as TextFieldProps).value}
          onChange={(e) => (props as TextFieldProps).onChange(e.target.value)}
          placeholder={(props as TextFieldProps).placeholder}
          className={inputClasses}
          aria-describedby={error ? `${name}-error` : undefined}
        />
      )}

      {type === "textarea" && (
        <textarea
          id={name}
          name={name}
          required={required}
          value={(props as TextareaFieldProps).value}
          onChange={(e) => (props as TextareaFieldProps).onChange(e.target.value)}
          placeholder={(props as TextareaFieldProps).placeholder}
          rows={(props as TextareaFieldProps).rows ?? 4}
          className={inputClasses}
          aria-describedby={error ? `${name}-error` : undefined}
        />
      )}

      {type === "select" && (
        <select
          id={name}
          name={name}
          required={required}
          value={(props as SelectFieldProps).value}
          onChange={(e) => (props as SelectFieldProps).onChange(e.target.value)}
          className={inputClasses}
          aria-describedby={error ? `${name}-error` : undefined}
        >
          <option value="">
            {(props as SelectFieldProps).placeholder ?? "Select..."}
          </option>
          {(props as SelectFieldProps).options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {type === "checkbox-group" && (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {(props as CheckboxGroupFieldProps).options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm text-near-black/80"
            >
              <input
                type="checkbox"
                name={name}
                value={opt.value}
                checked={(props as CheckboxGroupFieldProps).value.includes(opt.value)}
                onChange={(e) => {
                  const p = props as CheckboxGroupFieldProps;
                  if (e.target.checked) {
                    p.onChange([...p.value, opt.value]);
                  } else {
                    p.onChange(p.value.filter((v) => v !== opt.value));
                  }
                }}
                className="rounded border-near-black/30 text-dark-green focus:ring-dark-green"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}

      {type === "radio" && (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {(props as RadioFieldProps).options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm text-near-black/80"
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={(props as RadioFieldProps).value === opt.value}
                onChange={() => (props as RadioFieldProps).onChange(opt.value)}
                className="border-near-black/30 text-dark-green focus:ring-dark-green"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}

      {type === "checkbox" && (
        <label className="flex items-start gap-2.5 text-sm text-near-black/80">
          <input
            type="checkbox"
            name={name}
            checked={(props as CheckboxFieldProps).checked}
            onChange={(e) =>
              (props as CheckboxFieldProps).onChange(e.target.checked)
            }
            required={required}
            className="mt-0.5 rounded border-near-black/30 text-dark-green focus:ring-dark-green"
          />
          <span>
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </span>
        </label>
      )}

      {error && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
