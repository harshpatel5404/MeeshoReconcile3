import { Button } from '@/components/ui/button';
import { MoreHorizontal, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  title: string;
  subtitle: string;
  showExport?: boolean;
}

export default function Header({ title, subtitle, showExport = true }: HeaderProps) {
  const { toast } = useToast();

  const handleExport = () => {
    toast({
      title: "Export started",
      description: "Your data export will begin shortly.",
    });
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">{title}</h1>
          <p className="text-muted-foreground" data-testid="page-subtitle">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" data-testid="button-menu">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
          {showExport && (
            <Button onClick={handleExport} data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
