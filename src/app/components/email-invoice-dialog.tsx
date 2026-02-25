import { useState } from "react";
import { Mail, Send, X, FileText, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { toast } from "sonner";
import { Invoice } from "@/app/types";

interface EmailInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}

export function EmailInvoiceDialog({
  open,
  onOpenChange,
  invoice,
}: EmailInvoiceDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: invoice?.customer?.email || "",
    cc: "",
    subject: "",
    message: "",
  });

  // Set default values when invoice changes
  useState(() => {
    if (invoice) {
      setEmailForm({
        to: invoice.customer?.email || "",
        cc: "",
        subject: `Invoice ${invoice.invoiceNumber} from BNM parts POS`,
        message: `Dear ${invoice.customer.name},\n\nPlease find attached invoice ${invoice.invoiceNumber} for the amount of £${invoice.total.toFixed(2)}.\n\nPayment is due by ${new Date(invoice.dueDate).toLocaleDateString()}.\n\nThank you for your business!\n\nBest regards,\nBNM parts POS`,
      });
    }
  });

  const handleSendEmail = async () => {
    if (!emailForm.to) {
      toast.error("Please enter a recipient email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailForm.to)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSending(true);

    // Simulate sending email (in production, this would call a backend API)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // In a real application, you would:
    // 1. Generate the PDF on the server or convert to base64
    // 2. Send it to your backend API endpoint
    // 3. Backend would use a service like SendGrid, AWS SES, or Nodemailer
    
    try {
      // Mock API call
      console.log("Sending email:", {
        to: emailForm.to,
        cc: emailForm.cc,
        subject: emailForm.subject,
        message: emailForm.message,
        invoiceId: invoice?.id,
        invoiceNumber: invoice?.invoiceNumber,
      });

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-semibold">Email sent successfully!</p>
            <p className="text-sm text-gray-600">
              Invoice sent to {emailForm.to}
            </p>
          </div>
        </div>
      );

      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to send email. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            Email Invoice
          </DialogTitle>
          <DialogDescription>
            Send invoice {invoice.invoiceNumber} to the customer via email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invoice Preview */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {invoice.invoiceNumber}
                </p>
                <p className="text-sm text-gray-600">
                  {invoice.customer.name} • £{invoice.total.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Due: {new Date(invoice.dueDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Email Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to" className="text-sm font-medium">
                To <span className="text-red-500">*</span>
              </Label>
              <Input
                id="to"
                type="email"
                placeholder="customer@example.com"
                value={emailForm.to}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, to: e.target.value })
                }
                className="w-full"
                disabled={isSending}
              />
              {!invoice.customer.email && (
                <p className="text-xs text-amber-600">
                  ⚠️ No email on file for this customer. Please enter one.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cc" className="text-sm font-medium">
                CC (optional)
              </Label>
              <Input
                id="cc"
                type="email"
                placeholder="accounting@yourstore.com"
                value={emailForm.cc}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, cc: e.target.value })
                }
                className="w-full"
                disabled={isSending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">
                Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                type="text"
                value={emailForm.subject}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, subject: e.target.value })
                }
                className="w-full"
                disabled={isSending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium">
                Message <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="message"
                rows={8}
                value={emailForm.message}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, message: e.target.value })
                }
                className="w-full resize-none"
                disabled={isSending}
              />
              <p className="text-xs text-gray-500">
                The invoice will be attached as a PDF
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={isSending || !emailForm.to || !emailForm.subject}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSending ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}