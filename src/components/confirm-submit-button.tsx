"use client";

type ConfirmSubmitButtonProps = {
  className?: string;
  label: string;
  message: string;
};

export function ConfirmSubmitButton({
  className,
  label,
  message
}: ConfirmSubmitButtonProps) {
  return (
    <button
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {label}
    </button>
  );
}
