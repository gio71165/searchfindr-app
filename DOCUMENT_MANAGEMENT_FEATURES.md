# Document Management Features

This document outlines all the enhanced document management features that have been implemented.

## ✅ Implemented Features

### 1. Document Preview
- **PDF Preview**: Click the eye icon to preview PDF documents in a modal viewer
- **Quick View**: No need to download to view documents
- **Access Tracking**: Preview actions are tracked in the access log

### 2. Document Organization
- **Folders/Categories**: Organize documents into folders (Due Diligence, Legal, Financials, Marketing, Operations, Other)
- **Custom Tags**: Add tags to documents for flexible organization
- **Folder View**: Documents grouped by folder with expand/collapse
- **Filter by Folder**: Filter documents by folder in the search bar

### 3. Bulk Operations
- **Multi-Select**: Select multiple documents using checkboxes
- **Bulk Download**: Download selected documents as a ZIP file (requires JSZip package)
- **Select All**: Quick select all documents
- **Clear Selection**: Easy way to clear all selections

### 4. Document Search and Filtering
- **Search Bar**: Search by filename or notes
- **Type Filter**: Filter by document type (CIM, Financials, LOI, Term Sheet, Other)
- **Folder Filter**: Filter by folder
- **Real-time Search**: Results update as you type

### 5. Document Versioning
- **Version Tracking**: When uploading a new version, it's linked to the original
- **Version History**: View all versions of a document
- **Version Indicator**: Shows version number (v1, v2, etc.) on documents
- **Parent-Child Relationship**: Maintains relationship between versions

### 6. Document Activity Tracking
- **Access Log**: Tracks when documents are viewed, downloaded, or previewed
- **Access Count**: Shows how many times a document has been accessed
- **Last Accessed**: Shows when and by whom a document was last accessed
- **User Tracking**: Records which user accessed the document

### 7. Quick Actions
- **Attach to Another Deal**: Move documents between deals via "More" menu
- **Keyboard Shortcuts**:
  - `U` - Upload new document
  - `A` - Attach existing document
  - `/` - Focus search bar
- **More Menu**: Additional actions accessible via three-dot menu

### 8. Visual Improvements
- **File Type Icons**: Color-coded icons for different document types
- **File Size Display**: Shows file size in KB/MB
- **Upload Progress**: Visual progress bar during upload
- **Access Indicators**: Eye icon with count showing access frequency
- **Tag Badges**: Visual tags displayed on documents
- **Folder Icons**: Visual folder indicators

## 📋 Database Migration Required

Run the migration to enable all features:

```sql
-- Run migrations/007_enhance_document_management.sql
```

This adds:
- `folder` column for organization
- `tags` array column for flexible tagging
- `file_size` column for file metadata
- `parent_document_id` for versioning
- `accessed_at`, `accessed_by`, `access_count` for tracking
- `document_access_log` table for detailed access history

## 📦 Optional Dependencies

### JSZip (for Bulk Download)
For bulk ZIP download functionality, install JSZip:

```bash
npm install jszip
npm install --save-dev @types/jszip
```

**Note**: Without JSZip, bulk download will return individual download URLs instead of a ZIP file. The feature gracefully degrades.

## 🔧 API Endpoints

### New Endpoints
- `GET /api/deals/[id]/documents/search` - Search and filter documents
- `POST /api/deals/[id]/documents/bulk` - Bulk operations (download ZIP)
- `GET /api/deals/[id]/documents/[docId]/versions` - Get document versions
- `GET /api/deals/[id]/documents/[docId]/preview` - Get preview URL
- `PATCH /api/deals/[id]/documents/[docId]/metadata` - Update folder/tags/notes
- `POST /api/deals/[id]/documents/[docId]/attach-to-deal` - Attach to another deal

### Enhanced Endpoints
- `POST /api/deals/[id]/documents` - Now accepts folder, tags, file_size, parent_document_id
- `GET /api/deals/[id]/documents/[docId]` - Records access when downloading

## 🎯 Usage Examples

### Upload Document with Folder and Tags
1. Click "Add Document"
2. Select document type
3. Choose folder (optional)
4. Select tags (optional)
5. Upload file

### Search Documents
1. Type in search bar to search by filename/notes
2. Use type filter to filter by document type
3. Use folder filter to filter by folder

### Bulk Download
1. Select multiple documents using checkboxes
2. Click "Download (X)" button
3. Documents download as ZIP (if JSZip installed) or individually

### Attach to Another Deal
1. Click "More" menu (three dots) on a document
2. Select "Attach to another deal"
3. Choose target deal from dropdown
4. Click "Attach"

### View Versions
1. Click history icon on a document with versions
2. View all versions in the version history panel

## 🔐 Security

- All operations are workspace-scoped
- Access logging tracks user actions
- Documents can only be accessed by users in the same workspace
- RLS policies enforce workspace isolation

## 📝 Notes

- Document preview only works for PDF files
- Versioning is automatic when uploading a document with the same name (future enhancement)
- Access tracking is non-blocking (errors don't prevent document access)
- Folder and tag filters work together with search queries
