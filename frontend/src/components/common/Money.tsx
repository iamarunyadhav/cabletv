interface MoneyProps {
  amount: number;
  className?: string;
  showSign?: boolean;
}

export function Money({ amount, className = "", showSign = false }: MoneyProps) {
  const formatted = new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));

  const sign = showSign && amount !== 0 ? (amount > 0 ? "+" : "-") : "";
  const colorClass = amount < 0 ? "text-blue-600" : amount > 0 ? "text-green-600" : "";

  return (
    <span className={`font-medium ${colorClass} ${className}`}>
      {sign}{formatted}
    </span>
  );
}
