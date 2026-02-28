import dayjs from "dayjs";

type PaymentLike = {
  payment_date?: string;
  created_at?: string;
  createdAt?: string;
};

const hasTimeComponent = (value?: string | null) => {
  if (!value || typeof value !== "string") return false;
  return /[T\s]\d{1,2}:\d{2}/.test(value);
};

const isMidnight = (value: dayjs.Dayjs) =>
  value.hour() === 0 && value.minute() === 0 && value.second() === 0;

export const resolvePaymentDateTime = (payment: PaymentLike): string | null => {
  const paymentDate = payment.payment_date ?? payment.created_at ?? payment.createdAt;
  const createdAt = payment.created_at ?? payment.createdAt;

  if (!paymentDate && !createdAt) return null;

  const paymentParsed = paymentDate ? dayjs(paymentDate) : null;
  const createdParsed = createdAt ? dayjs(createdAt) : null;
  const createdHasTime = createdAt ? hasTimeComponent(createdAt) : false;
  const createdTimeValid = createdParsed?.isValid() && createdHasTime;

  if (paymentParsed?.isValid()) {
    const paymentHasTime = hasTimeComponent(paymentDate);

    if (!paymentHasTime && createdTimeValid) {
      return paymentParsed
        .hour(createdParsed!.hour())
        .minute(createdParsed!.minute())
        .second(createdParsed!.second())
        .millisecond(createdParsed!.millisecond())
        .toISOString();
    }

    if (paymentHasTime && isMidnight(paymentParsed) && createdTimeValid) {
      return paymentParsed
        .hour(createdParsed!.hour())
        .minute(createdParsed!.minute())
        .second(createdParsed!.second())
        .millisecond(createdParsed!.millisecond())
        .toISOString();
    }

    return paymentDate;
  }

  if (createdTimeValid) {
    return createdAt!;
  }

  return paymentDate ?? createdAt ?? null;
};
