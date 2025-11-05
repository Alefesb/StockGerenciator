import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { StockMovementDialog } from "@/components/stock/StockMovementDialog";
import { format } from "date-fns";

export default function Exits() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: exits, refetch } = useQuery({
    queryKey: ["exits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, products(name, unit)")
        .eq("type", "exit")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Saídas de Estoque</h1>
          <p className="text-muted-foreground">Registre saídas de produtos</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Saída
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Saídas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {exits && exits.length > 0 ? (
              exits.map((exit) => (
                <div
                  key={exit.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium">{exit.products?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantidade: {exit.quantity} {exit.products?.unit}
                    </p>
                    {exit.batch_number && (
                      <p className="text-sm text-muted-foreground">Lote: {exit.batch_number}</p>
                    )}
                    {exit.notes && (
                      <p className="text-sm text-muted-foreground">Obs: {exit.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {format(new Date(exit.created_at), "dd/MM/yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(exit.created_at), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma saída registrada</p>
            )}
          </div>
        </CardContent>
      </Card>

      <StockMovementDialog
        open={isDialogOpen}
        onOpenChange={() => {
          setIsDialogOpen(false);
          refetch();
        }}
        type="exit"
      />
    </div>
  );
}
