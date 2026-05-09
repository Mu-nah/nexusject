import { useState } from 'react'
import { useRouter } from 'next/router'
import { useMutation, useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import { Alert, Button, FormInput, Panel } from '@/components/ui'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function NewGrantPage() {
  const router = useRouter()
  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes'],
    queryFn: api.getProgrammes,
  })

  const [form, setForm] = useState({
    reference: '',
    name: '',
    funder: '',
    amount_awarded: '',
    start_date: '',
    end_date: '',
    report_due_date: '',
    programme_id: '',
    notes: '',
  })

  const createGrant = useMutation({
    mutationFn: () =>
      api.createGrant({
        reference: form.reference,
        name: form.name,
        funder: form.funder,
        amount_awarded: Number(form.amount_awarded || 0),
        amount_spent: 0,
        start_date: form.start_date,
        end_date: form.end_date,
        report_due_date: form.report_due_date || null,
        programme_id: form.programme_id ? Number(form.programme_id) : null,
        notes: form.notes || null,
        status: 'active',
      }),
    onSuccess: () => {
      toast.success('Grant created')
      router.push('/grants')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Failed to create grant')
    },
  })

  return (
    <AppLayout
      title="New Grant"
      subtitle="Create a grant record"
      actions={<Button variant="ghost" onClick={() => router.push('/grants')}>Back to Grants</Button>}
    >
      <Alert variant="info" icon="+">
        Add a new live or pipeline grant to the workspace so it can flow into reports, dashboards, and AI analysis.
      </Alert>

      <Panel title="Grant Details" style={{ maxWidth: 820 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          <FormInput label="Grant Reference" value={form.reference} onChange={(value) => setForm((current) => ({ ...current, reference: value }))} />
          <FormInput label="Grant Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
          <FormInput label="Funder" value={form.funder} onChange={(value) => setForm((current) => ({ ...current, funder: value }))} />
          <FormInput label="Award Amount" value={form.amount_awarded} onChange={(value) => setForm((current) => ({ ...current, amount_awarded: value }))} type="number" />
          <FormInput label="Start Date" value={form.start_date} onChange={(value) => setForm((current) => ({ ...current, start_date: value }))} type="date" />
          <FormInput label="End Date" value={form.end_date} onChange={(value) => setForm((current) => ({ ...current, end_date: value }))} type="date" />
          <FormInput label="Report Due Date" value={form.report_due_date} onChange={(value) => setForm((current) => ({ ...current, report_due_date: value }))} type="date" />
          <FormInput label="Programme" value={form.programme_id} onChange={(value) => setForm((current) => ({ ...current, programme_id: value }))} as="select">
            <option value="">Unassigned</option>
            {programmes.map((programme: any) => (
              <option key={programme.id} value={programme.id}>
                {programme.name}
              </option>
            ))}
          </FormInput>
        </div>

        <FormInput label="Notes" value={form.notes} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} as="textarea" />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => router.push('/grants')}>Cancel</Button>
          <Button
            onClick={() => createGrant.mutate()}
            disabled={
              createGrant.isPending ||
              !form.reference ||
              !form.name ||
              !form.funder ||
              !form.amount_awarded ||
              !form.start_date ||
              !form.end_date
            }
          >
            {createGrant.isPending ? 'Creating...' : 'Create Grant'}
          </Button>
        </div>
      </Panel>
    </AppLayout>
  )
}
