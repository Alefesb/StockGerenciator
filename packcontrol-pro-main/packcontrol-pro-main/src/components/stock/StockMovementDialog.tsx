import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

const movementSchema = z.object({
  product_id: z.string().min(1, "Selecione um produto"),
  quantity: z.number().min(0.01, "Quantidade deve ser maior que zero"),
});

interface StockMovementDialogProps {
  open: boolean;
  onOpenChange: () => void;
  type: "entry" | "exit";
}

export function StockMovementDialog({ open, onOpenChange, type }: StockMovementDialogProps) {
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 0,
    batch_number: "",
    expiration_date: "",
    notes: "",
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return data || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      movementSchema.parse({
        product_id: formData.product_id,
        quantity: formData.quantity,
      });

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        toast.error("Você precisa estar logado");
        return;
      }

      const { error } = await supabase.from("stock_movements").insert([
        {
          product_id: formData.product_id,
          type,
          quantity: formData.quantity,
          batch_number: formData.batch_number || null,
          expiration_date: formData.expiration_date || null,
          notes: formData.notes || null,
          user_id: session.session.user.id,
        },
      ]);

      if (error) throw error;

      toast.success(
        type === "entry" ? "Entrada registrada com sucesso!" : "Saída registrada com sucesso!"
      );

      setFormData({
        product_id: "",
        quantity: 0,
        batch_number: "",
        expiration_date: "",
        notes: "",
      });

      onOpenChange();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erro ao registrar movimentação");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === "entry" ? "Nova Entrada" : "Nova Saída"}
          </DialogTitle>
          <DialogDescription>
            Registre uma nova {type === "entry" ? "entrada" : "saída"} de produto
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Produto *</Label>
            <Select
              value={formData.product_id}
              onValueChange={(value) => setFormData({ ...formData, product_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {products?.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} (Estoque: {product.current_stock} {product.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batch">Número do Lote</Label>
              <Input
                id="batch"
                value={formData.batch_number}
                onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiration">Data de Validade</Label>
              <Input
                id="expiration"
                type="date"
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onOpenChange}>
              Cancelar
            </Button>
            <Button type="submit">Registrar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
