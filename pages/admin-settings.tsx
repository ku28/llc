import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

// Types
interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    lastLogin?: string;
}

interface SystemStats {
    totalUsers: number;
    totalPatients: number;
    totalProducts: number;
    totalVisits: number;
    totalPrescriptions: number;
    totalPurchaseOrders: number;
}

interface AuditLog {
    id: string;
    userId: string;
    userName: string;
    action: string;
    entity: string;
    timestamp: string;
    details?: string;
}

interface Backup {
    id: string;
    filename: string;
    size: string;
    createdAt: string;
}

interface DropdownFile {
    name: string;
    path: string;
    itemCount: number;
}

interface DropdownItem {
    id?: string;
    name?: string;
    label?: string;
    value?: string;
    [key: string]: any;
}

export default function AdminSettingsPage() {
    const router = useRouter();

    // Active tab state
    const [activeTab, setActiveTab] = useState('users');

    // Loading states
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Current user
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // User Management states
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userAction, setUserAction] = useState<'changeRole' | 'resetPassword' | 'expireSession' | 'delete' | null>(null);
    const [newRole, setNewRole] = useState('');

    // Data Management states
    const [dataCounts, setDataCounts] = useState<Record<string, number>>({});
    const [selectedTables, setSelectedTables] = useState<string[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // System & Stats states
    const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'xlsx'>('csv');

    // Activity Logs states
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [logSearch, setLogSearch] = useState('');
    const [logFilterAction, setLogFilterAction] = useState('all');
    const [logFilterEntity, setLogFilterEntity] = useState('all');

    // Backup & Export states
    const [backups, setBackups] = useState<Backup[]>([]);
    const [exportTable, setExportTable] = useState('users');
    const [exportDataFormat, setExportDataFormat] = useState<'csv' | 'json' | 'xlsx'>('csv');

    // Dropdown Options states
    const [dropdownFiles, setDropdownFiles] = useState<DropdownFile[]>([]);
    const [selectedDropdownFile, setSelectedDropdownFile] = useState<string | null>(null);
    const [dropdownItems, setDropdownItems] = useState<DropdownItem[]>([]);
    const [editingDropdownItem, setEditingDropdownItem] = useState<DropdownItem | null>(null);
    const [newDropdownItem, setNewDropdownItem] = useState<Partial<DropdownItem>>({});
    const [showDropdownItemModal, setShowDropdownItemModal] = useState(false);
    const [dropdownModalMode, setDropdownModalMode] = useState<'add' | 'edit'>('add');
    const [selectedDropdownItems, setSelectedDropdownItems] = useState<number[]>([]);

    // Fetch current user
    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                const data = await response.json();
                if (!data.user) {
                    router.push('/login');
                    return;
                }
                setCurrentUser(data.user);
                if (data.user.role !== 'admin') {
                    router.push('/dashboard');
                }
            } else {
                router.push('/login');
            }
        } catch (error) {
            console.error('Error fetching current user:', error);
            router.push('/login');
        }
    };

    // Fetch users
    const fetchUsers = async () => {
        setRefreshing(true);
        try {
            const response = await fetch('/api/admin/users');
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'users' && currentUser?.role === 'admin') {
            fetchUsers();
        }
    }, [activeTab, currentUser]);

    // Fetch data counts
    const fetchDataCounts = async () => {
        setRefreshing(true);
        try {
            const response = await fetch('/api/admin/data-counts');
            if (response.ok) {
                const data = await response.json();
                setDataCounts(data.counts);
            }
        } catch (error) {
            console.error('Error fetching data counts:', error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'data' && currentUser?.role === 'admin') {
            fetchDataCounts();
        }
    }, [activeTab, currentUser]);

    // Fetch system stats
    const fetchSystemStats = async () => {
        setRefreshing(true);
        try {
            const response = await fetch('/api/admin/system-stats');
            if (response.ok) {
                const data = await response.json();
                setSystemStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching system stats:', error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'stats' && currentUser?.role === 'admin') {
            fetchSystemStats();
        }
    }, [activeTab, currentUser]);

    // Fetch audit logs
    const fetchAuditLogs = async () => {
        setRefreshing(true);
        try {
            const response = await fetch('/api/admin/audit-logs');
            if (response.ok) {
                const data = await response.json();
                setAuditLogs(data.logs);
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'logs' && currentUser?.role === 'admin') {
            fetchAuditLogs();
        }
    }, [activeTab, currentUser]);

    // Fetch backups
    const fetchBackups = async () => {
        setRefreshing(true);
        try {
            const response = await fetch('/api/admin/backups');
            if (response.ok) {
                const data = await response.json();
                setBackups(data.backups);
            }
        } catch (error) {
            console.error('Error fetching backups:', error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'backup' && currentUser?.role === 'admin') {
            fetchBackups();
        }
    }, [activeTab, currentUser]);

    // Fetch dropdown files
    const fetchDropdownFiles = async () => {
        setRefreshing(true);
        try {
            const response = await fetch('/api/admin/dropdown-files');
            if (response.ok) {
                const data = await response.json();
                setDropdownFiles(data.files);
            }
        } catch (error) {
            console.error('Error fetching dropdown files:', error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'dropdowns' && currentUser?.role === 'admin') {
            fetchDropdownFiles();
        }
    }, [activeTab, currentUser]);

    // Fetch dropdown items when file is selected
    useEffect(() => {
        if (selectedDropdownFile) {
            fetchDropdownItems();
        }
    }, [selectedDropdownFile]);

    const fetchDropdownItems = async () => {
        if (!selectedDropdownFile) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/dropdown-data?file=${selectedDropdownFile}`);
            if (response.ok) {
                const result = await response.json();
                setDropdownItems(result.data || []);
            }
        } catch (error) {
            console.error('Error fetching dropdown items:', error);
        } finally {
            setLoading(false);
        }
    };

    // User action handlers
    const handleUserAction = async () => {
        if (!selectedUser || !userAction) return;

        setLoading(true);
        try {
            let endpoint = '';
            let method = 'POST';
            let body: any = { userId: selectedUser.id };

            switch (userAction) {
                case 'changeRole':
                    endpoint = '/api/admin/change-role';
                    body.newRole = newRole;
                    break;
                case 'resetPassword':
                    endpoint = '/api/admin/reset-user-password';
                    break;
                case 'expireSession':
                    endpoint = '/api/admin/expire-session';
                    break;
                case 'delete':
                    endpoint = '/api/admin/delete-user';
                    method = 'DELETE';
                    break;
            }

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                fetchUsers();
                setSelectedUser(null);
                setUserAction(null);
                setNewRole('');
            } else {
                const error = await response.json();
                alert(error.error || 'Action failed');
            }
        } catch (error) {
            console.error('Error performing user action:', error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    // Data deletion handler
    const handleDeleteData = async () => {
        if (selectedTables.length === 0) return;

        setLoading(true);
        try {
            const response = await fetch('/api/admin/delete-data', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tables: selectedTables }),
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                fetchDataCounts();
                setSelectedTables([]);
                setShowDeleteConfirm(false);
            } else {
                const error = await response.json();
                alert(error.error || 'Deletion failed');
            }
        } catch (error) {
            console.error('Error deleting data:', error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    // Bulk user import handler
    const handleImportUsers = async () => {
        if (!importFile) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', importFile);

            const response = await fetch('/api/admin/import-users', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                setImportFile(null);
            } else {
                const error = await response.json();
                alert(error.error || 'Import failed');
            }
        } catch (error) {
            console.error('Error importing users:', error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    // User export handler
    const handleExportUsers = async () => {
        try {
            const response = await fetch(`/api/admin/export-users?format=${exportFormat}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `users.${exportFormat}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Export failed');
            }
        } catch (error) {
            console.error('Error exporting users:', error);
            alert('An error occurred');
        }
    };

    // Backup creation handler
    const handleCreateBackup = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/create-backup', {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                fetchBackups();
            } else {
                const error = await response.json();
                alert(error.error || 'Backup creation failed');
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    // Data export handler
    const handleExportData = async () => {
        try {
            const response = await fetch(`/api/admin/export-data?table=${exportTable}&format=${exportDataFormat}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${exportTable}.${exportDataFormat}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Export failed');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('An error occurred');
        }
    };

    // Dropdown item handlers
    const handleAddDropdownItem = () => {
        setDropdownModalMode('add');
        setNewDropdownItem({});
        setEditingDropdownItem(null);
        setShowDropdownItemModal(true);
    };

    const handleEditDropdownItem = (item: DropdownItem) => {
        setDropdownModalMode('edit');
        setEditingDropdownItem(item);
        setNewDropdownItem(item);
        setShowDropdownItemModal(true);
    };

    const handleSaveDropdownItem = async () => {
        if (!selectedDropdownFile) return;

        setLoading(true);
        try {
            const method = dropdownModalMode === 'add' ? 'POST' : 'PUT';
            const response = await fetch('/api/admin/dropdown-data', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: selectedDropdownFile,
                    item: newDropdownItem,
                    originalItem: editingDropdownItem,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                fetchDropdownItems();
                setShowDropdownItemModal(false);
                setNewDropdownItem({});
                setEditingDropdownItem(null);
            } else {
                const error = await response.json();
                alert(error.error || 'Save failed');
            }
        } catch (error) {
            console.error('Error saving dropdown item:', error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDropdownItem = async (item: DropdownItem) => {
        if (!selectedDropdownFile || !confirm('Are you sure you want to delete this item?')) return;

        setLoading(true);
        try {
            const response = await fetch('/api/admin/dropdown-data', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: selectedDropdownFile,
                    item,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                fetchDropdownItems();
            } else {
                const error = await response.json();
                alert(error.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Error deleting dropdown item:', error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSelectedDropdownItems = async () => {
        if (!selectedDropdownFile || selectedDropdownItems.length === 0 || !confirm(`Are you sure you want to delete ${selectedDropdownItems.length} selected items?`)) return;

        setLoading(true);
        try {
            for (const index of selectedDropdownItems) {
                await fetch('/api/admin/dropdown-data', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file: selectedDropdownFile,
                        item: dropdownItems[index],
                    }),
                });
            }
            alert(`Successfully deleted ${selectedDropdownItems.length} items`);
            setSelectedDropdownItems([]);
            fetchDropdownItems();
        } catch (error) {
            console.error('Error deleting dropdown items:', error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    // Sidebar items
    const sidebarItems = [
        { 
            id: 'users', 
            label: 'User Console', 
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        },
        { 
            id: 'data', 
            label: 'Data Hub', 
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
        },
        { 
            id: 'stats', 
            label: 'System & Stats', 
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        },
        { 
            id: 'logs', 
            label: 'Activity Logs', 
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        },
        { 
            id: 'backup', 
            label: 'Backup & Export', 
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
        },
        { 
            id: 'dropdowns', 
            label: 'Dropdown Options', 
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        },
    ];

    // Filter logs
    const filteredLogs = auditLogs.filter(log => {
        const matchesSearch = logSearch === '' ||
            log.userName.toLowerCase().includes(logSearch.toLowerCase()) ||
            log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
            log.entity.toLowerCase().includes(logSearch.toLowerCase());

        const matchesAction = logFilterAction === 'all' || log.action === logFilterAction;
        const matchesEntity = logFilterEntity === 'all' || log.entity === logFilterEntity;

        return matchesSearch && matchesAction && matchesEntity;
    });

    if (!currentUser || currentUser.role !== 'admin') {
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar */}
                <div className="hidden md:block w-64 flex-shrink-0">
                    <div className="rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-4 sticky top-24 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                        <div className="relative mb-6">
                            <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                                Admin Settings
                            </h1>
                        </div>
                        <nav className="space-y-1">
                            {sidebarItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${activeTab === item.id
                                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 font-medium'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow-md text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <span className={activeTab === item.id ? 'text-white' : 'text-gray-600 dark:text-gray-400'}>{item.icon}</span>
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    {/* User Console Tab */}
                    {activeTab === 'users' && (
                        <div className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-4 sm:p-6 md:p-8 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                            <div className="relative">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                                        User Console
                                    </h2>
                                    <button
                                        onClick={fetchUsers}
                                        disabled={refreshing}
                                        className="bg-gradient-to-r from-green-500 to-green-600 text-white p-2 rounded-lg hover:shadow-lg shadow-green-500/30 transition-all disabled:opacity-50"
                                        title="Refresh users"
                                    >
                                        <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {users.map(user => (
                                        <div key={user.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow">
                                            <div className="flex flex-col space-y-3">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{user.name}</h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                                                        user.role === 'doctor' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                                            'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {new Date(user.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 pt-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setUserAction('changeRole');
                                                            setNewRole(user.role);
                                                        }}
                                                        className="px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 rounded-lg font-medium transition-colors text-sm"
                                                    >
                                                        Change Role
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setUserAction('resetPassword');
                                                        }}
                                                        className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg font-medium transition-colors text-sm"
                                                    >
                                                        Reset Password
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setUserAction('expireSession');
                                                        }}
                                                        className="px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 rounded-lg font-medium transition-colors text-sm"
                                                    >
                                                        Logout
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setUserAction('delete');
                                                        }}
                                                        className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg font-medium transition-colors text-sm"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Data Hub Tab */}
                    {activeTab === 'data' && (
                        <div className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-4 sm:p-6 md:p-8 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                            <div className="relative">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                                        Data Hub
                                    </h2>
                                    <button
                                        onClick={fetchDataCounts}
                                        disabled={refreshing}
                                        className="bg-gradient-to-r from-green-500 to-green-600 text-white p-2 rounded-lg hover:shadow-lg shadow-green-500/30 transition-all disabled:opacity-50"
                                        title="Refresh data"
                                    >
                                        <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                </div>

                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Select Data to Delete</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                    {Object.keys(dataCounts).map(table => (
                                        <label key={table} className="relative cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedTables.includes(table)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedTables([...selectedTables, table]);
                                                    } else {
                                                        setSelectedTables(selectedTables.filter(t => t !== table));
                                                    }
                                                }}
                                                className="peer sr-only"
                                            />
                                            <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-900/20 rounded-lg p-5 transition-all hover:shadow-md">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 capitalize">{table}</h4>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedTables.includes(table) ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                        {selectedTables.includes(table) && (
                                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{dataCounts[table]}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">records</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={selectedTables.length === 0}
                                    className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:shadow-lg shadow-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
                                >
                                    Delete Selected Data ({selectedTables.length} {selectedTables.length === 1 ? 'table' : 'tables'})
                                </button>
                            </div>
                        </div>
                    )}

                    {/* System & Stats Tab */}
                    {activeTab === 'stats' && (
                        <div className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-4 sm:p-6 md:p-8 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                            <div className="relative">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                                        System Statistics
                                    </h2>
                                    <button
                                        onClick={fetchSystemStats}
                                        disabled={refreshing}
                                        className="bg-gradient-to-r from-green-500 to-green-600 text-white p-2 rounded-lg hover:shadow-lg shadow-green-500/30 transition-all disabled:opacity-50"
                                        title="Refresh stats"
                                    >
                                        <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                </div>

                                {systemStats && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                                            <div className="text-sm opacity-90">Total Users</div>
                                            <div className="text-4xl font-bold mt-2">{systemStats.totalUsers}</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                                            <div className="text-sm opacity-90">Total Patients</div>
                                            <div className="text-4xl font-bold mt-2">{systemStats.totalPatients}</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                                            <div className="text-sm opacity-90">Total Products</div>
                                            <div className="text-4xl font-bold mt-2">{systemStats.totalProducts}</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                                            <div className="text-sm opacity-90">Total Visits</div>
                                            <div className="text-4xl font-bold mt-2">{systemStats.totalVisits}</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
                                            <div className="text-sm opacity-90">Total Prescriptions</div>
                                            <div className="text-4xl font-bold mt-2">{systemStats.totalPrescriptions}</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                                            <div className="text-sm opacity-90">Total Purchase Orders</div>
                                            <div className="text-4xl font-bold mt-2">{systemStats.totalPurchaseOrders}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Bulk User Import */}
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Bulk Import Users</h3>
                                        <div className="space-y-4">
                                            <input
                                                type="file"
                                                accept=".csv"
                                                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                                className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 dark:file:bg-emerald-900/30 file:text-emerald-700 dark:file:text-emerald-400 hover:file:bg-emerald-100 dark:hover:file:bg-emerald-900/50"
                                            />
                                            <button
                                                onClick={handleImportUsers}
                                                disabled={!importFile}
                                                className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                            >
                                                Import Users from CSV
                                            </button>
                                        </div>
                                    </div>

                                    {/* Bulk User Export */}
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Export Users</h3>
                                        <div className="space-y-4">
                                            <select
                                                value={exportFormat}
                                                onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json' | 'xlsx')}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-200"
                                            >
                                                <option value="csv">CSV</option>
                                                <option value="json">JSON</option>
                                                <option value="xlsx">Excel (XLSX)</option>
                                            </select>
                                            <button
                                                onClick={handleExportUsers}
                                                className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all w-full"
                                            >
                                                Export All Users
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Activity Logs Tab */}
                    {activeTab === 'logs' && (
                        <div className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-4 sm:p-6 md:p-8 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                            <div className="relative">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                                        Activity Logs
                                    </h2>
                                    <button
                                        onClick={fetchAuditLogs}
                                        disabled={refreshing}
                                        className="bg-gradient-to-r from-green-500 to-green-600 text-white p-2 rounded-lg hover:shadow-lg shadow-green-500/30 transition-all disabled:opacity-50"
                                        title="Refresh logs"
                                    >
                                        <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <input
                                        type="text"
                                        placeholder="Search logs..."
                                        value={logSearch}
                                        onChange={(e) => setLogSearch(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-200"
                                    />
                                    <select
                                        value={logFilterAction}
                                        onChange={(e) => setLogFilterAction(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-200"
                                    >
                                        <option value="all">All Actions</option>
                                        <option value="create">Create</option>
                                        <option value="update">Update</option>
                                        <option value="delete">Delete</option>
                                    </select>
                                    <select
                                        value={logFilterEntity}
                                        onChange={(e) => setLogFilterEntity(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-200"
                                    >
                                        <option value="all">All Entities</option>
                                        <option value="user">User</option>
                                        <option value="patient">Patient</option>
                                        <option value="product">Product</option>
                                        <option value="prescription">Prescription</option>
                                    </select>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Timestamp</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">User</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Action</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Entity</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {filteredLogs.map(log => (
                                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                            {new Date(log.timestamp).toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{log.userName}</td>
                                                        <td className="px-6 py-4 text-sm">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${log.action === 'create' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                                                log.action === 'update' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                                                    log.action === 'delete' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                                                        'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                                                }`}>
                                                                {log.action}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 capitalize">{log.entity}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{log.details || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}                    {/* Backup & Export Tab */}
                    {activeTab === 'backup' && (
                        <div className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-4 sm:p-6 md:p-8 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                            <div className="relative">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                                        Backup & Export
                                    </h2>
                                    <button
                                        onClick={fetchBackups}
                                        disabled={refreshing}
                                        className="bg-gradient-to-r from-green-500 to-green-600 text-white p-2 rounded-lg hover:shadow-lg shadow-green-500/30 transition-all disabled:opacity-50"
                                        title="Refresh backups"
                                    >
                                        <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                    {/* Create Backup */}
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Database Backup</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Create a full backup of the database</p>
                                        <button
                                            onClick={handleCreateBackup}
                                            className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all w-full"
                                        >
                                            Create New Backup
                                        </button>
                                    </div>

                                    {/* Export Data */}
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Export Data</h3>
                                        <div className="space-y-4">
                                            <select
                                                value={exportTable}
                                                onChange={(e) => setExportTable(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-200"
                                            >
                                                <option value="users">Users</option>
                                                <option value="patients">Patients</option>
                                                <option value="products">Products</option>
                                                <option value="visits">Visits</option>
                                                <option value="prescriptions">Prescriptions</option>
                                            </select>
                                            <select
                                                value={exportDataFormat}
                                                onChange={(e) => setExportDataFormat(e.target.value as 'csv' | 'json' | 'xlsx')}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-200"
                                            >
                                                <option value="csv">CSV</option>
                                                <option value="json">JSON</option>
                                                <option value="xlsx">Excel (XLSX)</option>
                                            </select>
                                            <button
                                                onClick={handleExportData}
                                                className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all w-full"
                                            >
                                                Export Table Data
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Backup List */}
                                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Recent Backups</h3>
                                    </div>
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Filename</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Size</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Created</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {backups.map(backup => (
                                                <tr key={backup.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{backup.filename}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{backup.size}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                        {new Date(backup.createdAt).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dropdown Options Tab */}
                    {activeTab === 'dropdowns' && (
                        <div className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-4 sm:p-6 md:p-8 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                            <div className="relative">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                                        Dropdown Options
                                    </h2>
                                    <button
                                        onClick={fetchDropdownFiles}
                                        disabled={refreshing}
                                        className="bg-gradient-to-r from-green-500 to-green-600 text-white p-2 rounded-lg hover:shadow-lg shadow-green-500/30 transition-all disabled:opacity-50"
                                        title="Refresh files"
                                    >
                                        <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* File List */}
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Dropdown Files</h3>
                                        <div className="space-y-2">
                                            {dropdownFiles.map(file => (
                                                <button
                                                    key={file.name}
                                                    onClick={() => setSelectedDropdownFile(file.name)}
                                                    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${selectedDropdownFile === file.name
                                                        ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border-2 border-emerald-600 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400'
                                                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                                                        }`}
                                                >
                                                    <div className="font-medium">{file.name}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{file.itemCount} items</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Items List */}
                                    <div className="lg:col-span-2">
                                        {selectedDropdownFile ? (
                                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                                        {selectedDropdownFile} Options
                                                    </h3>
                                                    <div className="flex gap-2">
                                                        {selectedDropdownItems.length > 0 && (
                                                            <button
                                                                onClick={handleDeleteSelectedDropdownItems}
                                                                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all text-sm"
                                                            >
                                                                Delete Selected ({selectedDropdownItems.length})
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={handleAddDropdownItem}
                                                            className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all text-sm"
                                                        >
                                                            + Add Item
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    {dropdownItems && dropdownItems.length > 0 ? dropdownItems.map((item, index) => (
                                                        <div
                                                            key={index}
                                                            className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedDropdownItems.includes(index)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedDropdownItems([...selectedDropdownItems, index]);
                                                                    } else {
                                                                        setSelectedDropdownItems(selectedDropdownItems.filter(i => i !== index));
                                                                    }
                                                                }}
                                                                className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                            />
                                                            <div className="flex-1">
                                                                <div className="font-medium text-gray-900 dark:text-gray-200">
                                                                    {item.name || item.label || item.value || JSON.stringify(item)}
                                                                </div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                    {Object.entries(item).map(([key, val]) => (
                                                                        <span key={key} className="mr-3">
                                                                            {key}: {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <button
                                                                    onClick={() => handleEditDropdownItem(item)}
                                                                    className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                                                    title="Edit item"
                                                                >
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteDropdownItem(item)}
                                                                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                    title="Delete item"
                                                                >
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )) : (
                                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                            No items found
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
                                                <div className="text-gray-400 dark:text-gray-500 text-lg">Select a dropdown file to view and edit options</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* User Action Modal */}
            {selectedUser && userAction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-2xl p-6 w-full max-w-md">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                        <div className="relative">
                            <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
                            {userAction === 'changeRole' ? 'Change User Role' :
                                userAction === 'resetPassword' ? 'Reset Password' :
                                    userAction === 'expireSession' ? 'Expire Session' :
                                        'Delete User'}
                        </h3>

                        <div className="mb-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">User: <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedUser.name}</span></p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Email: <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedUser.email}</span></p>
                        </div>

                        {userAction === 'changeRole' && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Role</label>
                                <select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-200"
                                >
                                    <option value="user">User</option>
                                    <option value="doctor">Doctor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        )}

                        {userAction === 'delete' && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">⚠️ This action cannot be undone. All user data will be permanently deleted.</p>
                            </div>
                        )}

                        <div className="flex space-x-3">
                            <button
                                onClick={handleUserAction}
                                className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-all ${userAction === 'delete'
                                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:shadow-lg'
                                    : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:shadow-lg'
                                    }`}
                            >
                                Confirm
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedUser(null);
                                    setUserAction(null);
                                    setNewRole('');
                                }}
                                className="flex-1 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Data Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-2xl p-6 w-full max-w-md">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                        <div className="relative">
                            <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">Confirm Data Deletion</h3>

                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700 mb-2">⚠️ You are about to delete data from the following tables:</p>
                            <ul className="list-disc list-inside text-sm text-red-700">
                                {selectedTables.map(table => (
                                    <li key={table} className="capitalize">{table} ({dataCounts[table]} records)</li>
                                ))}
                            </ul>
                            <p className="text-sm text-red-700 mt-2 font-semibold">This action cannot be undone!</p>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={handleDeleteData}
                                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white font-medium hover:shadow-lg transition-all"
                            >
                                Delete Data
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dropdown Item Modal */}
            {showDropdownItemModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                        <div className="relative">
                            <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
                                {dropdownModalMode === 'add' ? 'Add New Item' : 'Edit Item'}
                            </h3>

                            <div className="space-y-4 mb-4">
                                {Object.keys(editingDropdownItem || (dropdownItems && dropdownItems.length > 0 ? dropdownItems[0] : null) || { name: '', value: '' }).map(key => (
                                    <div key={key}>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">{key}</label>
                                        <input
                                            type="text"
                                            value={newDropdownItem[key] || ''}
                                            onChange={(e) => setNewDropdownItem({ ...newDropdownItem, [key]: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-200"
                                        />
                                </div>
                            ))}
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={handleSaveDropdownItem}
                                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white font-medium hover:shadow-lg transition-all"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => {
                                    setShowDropdownItemModal(false);
                                    setNewDropdownItem({});
                                    setEditingDropdownItem(null);
                                }}
                                className="flex-1 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
