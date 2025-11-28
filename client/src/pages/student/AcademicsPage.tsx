import { useState, useEffect } from 'react';
import { Plus, BookOpen, Award, Trash2, Edit, FileText } from 'lucide-react';
import { studentAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Loading } from '../../components/ui/Loading';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Textarea } from '../../components/ui/Textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import type { Semester } from '../../types';

const semesterOptions = [
  { value: '', label: 'Select Semester' },
  { value: '1', label: 'Semester 1' },
  { value: '2', label: 'Semester 2' },
  { value: '3', label: 'Semester 3' },
  { value: '4', label: 'Semester 4' },
  { value: '5', label: 'Semester 5' },
  { value: '6', label: 'Semester 6' },
  { value: '7', label: 'Semester 7' },
  { value: '8', label: 'Semester 8' },
];

const currentYear = new Date().getFullYear();
const yearOptions = [
  { value: '', label: 'Select Year' },
  ...Array.from({ length: 10 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  })),
];

const gradeOptions = [
  { value: '', label: 'Grade' },
  { value: 'O', label: 'O (Outstanding)' },
  { value: 'A+', label: 'A+' },
  { value: 'A', label: 'A' },
  { value: 'B+', label: 'B+' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'F', label: 'F (Fail)' },
];

interface Subject {
  name: string;
  code: string;
  credits: number;
  grade?: string;
  marks?: number;
}

export const AcademicsPage: React.FC = () => {
  const [records, setRecords] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Semester | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    semester: '',
    year: '',
    sgpa: '',
    cgpa: '',
    backlogs: '0',
    achievements: '',
    remarks: '',
    subjects: [] as Subject[],
  });

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await studentAPI.getAcademicRecords();
      setRecords(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch academic records:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      semester: '',
      year: '',
      sgpa: '',
      cgpa: '',
      backlogs: '0',
      achievements: '',
      remarks: '',
      subjects: [],
    });
  };

  const handleAddSubject = () => {
    setFormData(prev => ({
      ...prev,
      subjects: [...prev.subjects, { name: '', code: '', credits: 0, grade: '', marks: 0 }],
    }));
  };

  const handleRemoveSubject = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index),
    }));
  };

  const handleSubjectChange = (index: number, field: keyof Subject, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }));
  };

  const handleAddRecord = async () => {
    if (!formData.semester || !formData.year) return;
    setSaving(true);
    try {
      await studentAPI.addAcademicRecord({
        semester: parseInt(formData.semester),
        year: parseInt(formData.year),
        sgpa: formData.sgpa ? parseFloat(formData.sgpa) : undefined,
        cgpa: formData.cgpa ? parseFloat(formData.cgpa) : undefined,
        backlogs: parseInt(formData.backlogs),
        achievements: formData.achievements,
        remarks: formData.remarks,
        subjects: formData.subjects.filter(s => s.name && s.code),
      });
      setShowAddModal(false);
      resetForm();
      fetchRecords();
    } catch (error) {
      console.error('Failed to add record:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditRecord = (record: Semester) => {
    setSelectedRecord(record);
    setFormData({
      semester: String(record.semester),
      year: String(record.year),
      sgpa: record.sgpa?.toString() || '',
      cgpa: record.cgpa?.toString() || '',
      backlogs: record.backlogs?.toString() || '0',
      achievements: record.achievements || '',
      remarks: record.remarks || '',
      subjects: record.subjects || [],
    });
    setShowEditModal(true);
  };

  const handleUpdateRecord = async () => {
    if (!selectedRecord || !formData.semester || !formData.year) return;
    setSaving(true);
    try {
      await studentAPI.updateAcademicRecord(selectedRecord._id, {
        semester: parseInt(formData.semester),
        year: parseInt(formData.year),
        sgpa: formData.sgpa ? parseFloat(formData.sgpa) : undefined,
        cgpa: formData.cgpa ? parseFloat(formData.cgpa) : undefined,
        backlogs: parseInt(formData.backlogs),
        achievements: formData.achievements,
        remarks: formData.remarks,
        subjects: formData.subjects.filter(s => s.name && s.code),
      });
      setShowEditModal(false);
      setSelectedRecord(null);
      resetForm();
      fetchRecords();
    } catch (error) {
      console.error('Failed to update record:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await studentAPI.deleteAcademicRecord(id);
      fetchRecords();
    } catch (error) {
      console.error('Failed to delete record:', error);
    }
  };

  const calculateOverallCGPA = () => {
    if (records.length === 0) return 'N/A';
    const recordsWithCgpa = records.filter(r => r.cgpa);
    if (recordsWithCgpa.length === 0) return 'N/A';
    const latest = recordsWithCgpa.sort((a, b) => b.semester - a.semester)[0];
    return latest.cgpa?.toFixed(2) || 'N/A';
  };

  const totalBacklogs = records.reduce((sum, r) => sum + (r.backlogs || 0), 0);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loading size="lg" text="Loading academic records..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Academic Records</h1>
          <p className="text-muted-foreground mt-1">
            Track your semester-wise academic performance
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setShowAddModal(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Semester
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current CGPA</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{calculateOverallCGPA()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Semesters Completed</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{records.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Backlogs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalBacklogs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Semester Records */}
      {records.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No academic records</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding your first semester record
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Semester
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {records.sort((a, b) => b.semester - a.semester).map((record) => (
            <Card key={record._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Semester {record.semester}
                      {record.backlogs && record.backlogs > 0 && (
                        <Badge variant="destructive">{record.backlogs} Backlogs</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Academic Year {record.year}</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">SGPA</div>
                      <div className="text-2xl font-bold">{record.sgpa?.toFixed(2) || 'N/A'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">CGPA</div>
                      <div className="text-2xl font-bold">{record.cgpa?.toFixed(2) || 'N/A'}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditRecord(record)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDeleteRecord(record._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              {record.subjects && record.subjects.length > 0 && (
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Marks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {record.subjects.map((subject, index) => (
                        <TableRow key={index}>
                          <TableCell>{subject.name}</TableCell>
                          <TableCell>{subject.code}</TableCell>
                          <TableCell>{subject.credits}</TableCell>
                          <TableCell>
                            <Badge variant={subject.grade === 'F' ? 'destructive' : 'default'}>
                              {subject.grade || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>{subject.marks || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {record.achievements && (
                    <div className="mt-4 p-3 bg-accent rounded-lg">
                      <div className="text-sm font-medium mb-1">Achievements</div>
                      <p className="text-sm text-muted-foreground">{record.achievements}</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedRecord(null);
          resetForm();
        }}
        title={showEditModal ? 'Edit Semester Record' : 'Add Semester Record'}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Semester *</label>
              <Select
                value={formData.semester}
                onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                options={semesterOptions}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Year *</label>
              <Select
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                options={yearOptions}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">SGPA</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={formData.sgpa}
                onChange={(e) => setFormData(prev => ({ ...prev, sgpa: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">CGPA</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={formData.cgpa}
                onChange={(e) => setFormData(prev => ({ ...prev, cgpa: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Backlogs</label>
              <Input
                type="number"
                min="0"
                value={formData.backlogs}
                onChange={(e) => setFormData(prev => ({ ...prev, backlogs: e.target.value }))}
              />
            </div>
          </div>

          {/* Subjects */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Subjects</label>
              <Button variant="outline" size="sm" onClick={handleAddSubject}>
                <Plus className="h-3 w-3 mr-1" />
                Add Subject
              </Button>
            </div>
            {formData.subjects.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {formData.subjects.map((subject, index) => (
                  <div key={index} className="grid grid-cols-6 gap-2 items-center">
                    <Input
                      placeholder="Name"
                      value={subject.name}
                      onChange={(e) => handleSubjectChange(index, 'name', e.target.value)}
                      className="col-span-2"
                    />
                    <Input
                      placeholder="Code"
                      value={subject.code}
                      onChange={(e) => handleSubjectChange(index, 'code', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Credits"
                      value={subject.credits || ''}
                      onChange={(e) => handleSubjectChange(index, 'credits', parseInt(e.target.value) || 0)}
                    />
                    <Select
                      value={subject.grade || ''}
                      onChange={(e) => handleSubjectChange(index, 'grade', e.target.value)}
                      options={gradeOptions}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSubject(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Achievements</label>
            <Textarea
              value={formData.achievements}
              onChange={(e) => setFormData(prev => ({ ...prev, achievements: e.target.value }))}
              placeholder="Any achievements this semester..."
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Remarks</label>
            <Textarea
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowAddModal(false);
              setShowEditModal(false);
              setSelectedRecord(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={showEditModal ? handleUpdateRecord : handleAddRecord}
              disabled={saving || !formData.semester || !formData.year}
            >
              {saving ? <Loading size="sm" /> : showEditModal ? 'Update' : 'Add Record'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
