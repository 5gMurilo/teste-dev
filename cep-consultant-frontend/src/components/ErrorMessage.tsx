export function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="error-message" role="alert">
      {message}
    </p>
  );
}
