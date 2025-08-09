import React from "react";

export default function AddCharacterModal({
  open,
  values,
  onChange,
  onSubmit,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-5 w-[360px] shadow-2xl text-left">
        <h3 className="mb-4 text-lg font-semibold">Add Character</h3>
        <form onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="block font-semibold mb-1 text-left">Name</label>
            <input
              type="text"
              name="name"
              value={values.name}
              onChange={onChange}
              placeholder="e.g., Frodo"
              className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="mb-3">
            <label className="block font-semibold mb-1 text-left">
              Personality
            </label>
            <input
              type="text"
              name="trait"
              value={values.trait}
              onChange={onChange}
              placeholder="e.g., Brave, wise"
              className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block font-semibold mb-1 text-left">Avatar</label>
            <input
              type="file"
              name="avatar"
              accept="image/*"
              onChange={onChange}
              className="block"
            />
            {values.avatarUrl && (
              <div className="mt-2">
                <img
                  src={values.avatarUrl}
                  alt="preview"
                  width={60}
                  height={60}
                  className="rounded-full"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
