import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Button, Loading, useToast, useConfirm, Textarea } from '@/components/shared';
import { DescriptionCard } from '@/components/preview/DescriptionCard';
import { useProjectStore } from '@/store/useProjectStore';
import { updateProject } from '@/api/endpoints';

export const DetailEditor: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const fromHistory = (location.state as any)?.from === 'history';
  const {
    currentProject,
    syncProject,
    updatePageLocal,
    generateDescriptions,
    generatePageDescription,
    isGlobalLoading,
    taskProgress,
  } = useProjectStore();
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [extraRequirements, setExtraRequirements] = useState<string>('');
  const [isSavingRequirements, setIsSavingRequirements] = useState(false);

  // 加载项目数据
  useEffect(() => {
    if (projectId && (!currentProject || currentProject.id !== projectId)) {
      // 直接使用 projectId 同步项目数据
      syncProject(projectId);
    }
  }, [projectId, currentProject, syncProject]);

  // 当项目加载后，初始化额外要求
  useEffect(() => {
    if (currentProject) {
      setExtraRequirements(currentProject.extra_requirements || '');
    }
  }, [currentProject]);

  const handleGenerateAll = async () => {
    const hasDescriptions = currentProject?.pages.some(
      (p) => p.description_content
    );
    
    const executeGenerate = async () => {
      await generateDescriptions();
    };
    
    if (hasDescriptions) {
      confirm(
        '部分页面已有描述，重新生成将覆盖，确定继续吗？',
        executeGenerate,
        { title: '确认重新生成', variant: 'warning' }
      );
    } else {
      await executeGenerate();
    }
  };

  const handleRegeneratePage = async (pageId: string) => {
    if (!currentProject) return;
    
    const page = currentProject.pages.find((p) => p.id === pageId);
    if (!page) return;
    
    // 如果已有描述，询问是否覆盖
    if (page.description_content) {
      confirm(
        '该页面已有描述，重新生成将覆盖现有内容，确定继续吗？',
        async () => {
          try {
            await generatePageDescription(pageId);
            show({ message: '生成成功', type: 'success' });
          } catch (error: any) {
            show({ 
              message: `生成失败: ${error.message || '未知错误'}`, 
              type: 'error' 
            });
          }
        },
        { title: '确认重新生成', variant: 'warning' }
      );
      return;
    }
    
    try {
      await generatePageDescription(pageId);
      show({ message: '生成成功', type: 'success' });
    } catch (error: any) {
      show({ 
        message: `生成失败: ${error.message || '未知错误'}`, 
        type: 'error' 
      });
    }
  };

  const handleSaveExtraRequirements = async () => {
    if (!currentProject || !projectId) return;
    
    setIsSavingRequirements(true);
    try {
      await updateProject(projectId, { extra_requirements: extraRequirements || '' });
      // 更新本地项目状态
      await syncProject(projectId);
      show({ message: '额外要求已保存', type: 'success' });
    } catch (error: any) {
      show({ 
        message: `保存失败: ${error.message || '未知错误'}`, 
        type: 'error' 
      });
    } finally {
      setIsSavingRequirements(false);
    }
  };

  if (!currentProject) {
    return <Loading fullscreen message="加载项目中..." />;
  }

  if (isGlobalLoading) {
    return (
      <Loading
        fullscreen
        message="生成页面描述中..."
        progress={taskProgress || undefined}
      />
    );
  }

  const hasAllDescriptions = currentProject.pages.every(
    (p) => p.description_content
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶栏 */}
      <header className="h-16 bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={18} />}
            onClick={() => {
              if (fromHistory) {
                navigate('/history');
              } else {
                navigate(`/project/${projectId}/outline`);
              }
            }}
          >
            返回
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍌</span>
            <span className="text-xl font-bold">蕉幻</span>
          </div>
          <span className="text-gray-400">|</span>
          <span className="text-lg font-semibold">编辑页面描述</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowLeft size={18} />}
            onClick={() => navigate(`/project/${projectId}/outline`)}
          >
            上一步
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<ArrowRight size={18} />}
            onClick={() => navigate(`/project/${projectId}/preview`)}
            disabled={!hasAllDescriptions}
          >
            生成图片
          </Button>
        </div>
      </header>

      {/* 额外要求输入框 */}
      <div className="bg-banana-50 border-b border-banana-100 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <Textarea
                label="额外要求（将应用到每个页面的AI提示词）"
                value={extraRequirements}
                onChange={(e) => setExtraRequirements(e.target.value)}
                placeholder="例如：使用简洁的设计风格，文字要清晰易读，配色要专业..."
                rows={3}
              />
            </div>
            <div className="pt-7">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveExtraRequirements}
                disabled={isSavingRequirements}
              >
                {isSavingRequirements ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              icon={<Sparkles size={18} />}
              onClick={handleGenerateAll}
            >
              批量生成描述
            </Button>
            <span className="text-sm text-gray-500">
              {currentProject.pages.filter((p) => p.description_content).length} /{' '}
              {currentProject.pages.length} 页已完成
            </span>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {currentProject.pages.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                还没有页面
              </h3>
              <p className="text-gray-500 mb-6">
                请先返回大纲编辑页添加页面
              </p>
              <Button
                variant="primary"
                onClick={() => navigate(`/project/${projectId}/outline`)}
              >
                返回大纲编辑
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentProject.pages.map((page, index) => {
                const pageId = page.id || page.page_id;
                return (
                  <DescriptionCard
                    key={pageId}
                    page={page}
                    index={index}
                    onUpdate={(data) => updatePageLocal(pageId, data)}
                    onRegenerate={() => handleRegeneratePage(pageId)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>
      <ToastContainer />
      {ConfirmDialog}
    </div>
  );
};

