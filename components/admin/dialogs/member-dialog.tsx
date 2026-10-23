'use client';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '../modal';
import { navigation } from '../config';
import { useAdmin } from '../context';

/** Add a sub-admin or change which pages they can open. */
export function MemberDialog() {
  const { memberEdit, busy, error, saveMember, setMemberEdit } = useAdmin();
  if (!memberEdit) return null;

  return (
    <Modal title={memberEdit.user_id ? 'Edit tab access' : 'Add a sub-admin'} onClose={() => setMemberEdit(null)}>
      <form onSubmit={saveMember}>
        <label>
          Name
          <input
            required
            maxLength={100}
            value={memberEdit.name}
            onChange={(e) => setMemberEdit({ ...memberEdit, name: e.target.value })}
          />
        </label>
        <label>
          Account email
          <input
            required
            type="email"
            readOnly={!!memberEdit.user_id}
            value={memberEdit.email}
            onChange={(e) => setMemberEdit({ ...memberEdit, email: e.target.value })}
          />
        </label>
        <p className="table-help">Use an existing customer account email. This grants admin tabs; it does not send an invitation or create a password.</p>
        <div className="permission-selector">
          <b>Allow access to</b>
          {navigation
            .filter((n) => n.id !== 'team')
            .map(({ id, label, icon: Icon }) => (
              <label className="checkbox" key={id}>
                <input
                  type="checkbox"
                  checked={memberEdit.permissions.includes(id)}
                  onChange={(e) =>
                    setMemberEdit({
                      ...memberEdit,
                      permissions: e.target.checked
                        ? [...memberEdit.permissions, id]
                        : memberEdit.permissions.filter((p) => p !== id),
                    })
                  }
                />
                <Icon size={16} />
                {label}
              </label>
            ))}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button modal-save" disabled={busy}>
          <ShieldCheck size={17} /> Save tab access
        </button>
      </form>
    </Modal>
  );
}
