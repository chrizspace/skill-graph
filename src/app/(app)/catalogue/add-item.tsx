import { ActionForm, ActionInput, ActionSelect, ActionTextarea } from "@/components/app/action-form";
import { Label } from "@/components/ui/label";
import { createCatalogueItemAction } from "../practices/actions";

/** Add a skill or certification to the shared catalogue (Practice Leads and the Site Lead). A name that exists is refused. */
export function AddItem() {
  return (
    <section id="add" aria-labelledby="add-heading" className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 id="add-heading" className="text-xl font-semibold">
        Add to the catalogue
      </h2>
      <p className="text-sm text-muted-foreground">
        One shared catalogue for the whole site: there is one &ldquo;Python&rdquo;, not one per practice.
        Search first; a name that already exists (ignoring case and punctuation) can&apos;t be added again.
      </p>
      <ActionForm action={createCatalogueItemAction} submit="Add to the catalogue" className="max-w-2xl">
        <div className="flex flex-wrap gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="item-type">Type</Label>
            <ActionSelect id="item-type" name="type" required defaultValue="technical_skill" className="w-48">
              <option value="technical_skill">Technical skill</option>
              <option value="soft_skill">Soft skill</option>
              <option value="certification">Certification</option>
            </ActionSelect>
          </div>
          <div className="grid min-w-56 flex-1 gap-1.5">
            <Label htmlFor="item-name">Name</Label>
            <ActionInput id="item-name" name="name" required maxLength={120} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="grid min-w-48 flex-1 gap-1.5">
            <Label htmlFor="item-category">Category (optional)</Label>
            <ActionInput
              id="item-category"
              name="category"
              maxLength={80}
              placeholder="e.g. Tool / platform"
            />
          </div>
          <div className="grid min-w-48 flex-1 gap-1.5">
            <Label htmlFor="item-issuer">Issuer (certifications only)</Label>
            <ActionInput id="item-issuer" name="issuer" maxLength={120} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="item-description">Description (optional)</Label>
          <ActionTextarea id="item-description" name="description" maxLength={2000} />
        </div>
      </ActionForm>
    </section>
  );
}
