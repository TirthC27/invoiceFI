'use client';

/**
 * Payment Schedule Component
 */

import { Payment } from '@/types';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';

interface PaymentScheduleProps {
  payments: Payment[];
}

export function PaymentSchedule({ payments }: PaymentScheduleProps) {
  if (!payments || payments.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No upcoming payments</p>
      </div>
    );
  }

  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  return (
    <div className="space-y-3">
      {sortedPayments.map((payment) => (
        <PaymentItem key={payment.id} payment={payment} />
      ))}
    </div>
  );
}

function PaymentItem({ payment }: { payment: Payment }) {
  const dueDate = new Date(payment.due_date);
  const isOverdue = isPast(dueDate) && payment.status !== 'paid';
  const isDueSoon = isWithinInterval(dueDate, {
    start: new Date(),
    end: addDays(new Date(), 7),
  });

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border ${
        isOverdue
          ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
          : isDueSoon
          ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700'
          : 'bg-gray-50 border-gray-200 dark:bg-gray-700/50 dark:border-gray-600'
      }`}
    >
      <div>
        <p className="font-medium">${payment.amount.toLocaleString()}</p>
        <p className="text-sm text-gray-500">
          Due: {format(dueDate, 'MMM d, yyyy')}
        </p>
      </div>
      <div className="flex items-center space-x-3">
        {isOverdue && (
          <span className="badge badge-danger">Overdue</span>
        )}
        {isDueSoon && !isOverdue && (
          <span className="badge badge-warning">Due Soon</span>
        )}
        {payment.status !== 'paid' && (
          <button className="btn-primary text-sm py-1 px-3">
            Pay Now
          </button>
        )}
        {payment.status === 'paid' && (
          <span className="badge badge-success">Paid</span>
        )}
      </div>
    </div>
  );
}
