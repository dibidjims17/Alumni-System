using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class NewsRepository : INewsRepository
    {
        private readonly AppDbContext _context;

        public NewsRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<News>> GetPublishedAsync(int page, int pageSize)
        {
            return await _context.News
                .Where(n => n.IsPublished && !n.IsDeleted)
                .Include(n => n.PostedByAdmin)
                .Include(n => n.Hearts)
                .Include(n => n.Comments.Where(c => !c.IsDeleted))
                    .ThenInclude(c => c.Likes)
                .OrderByDescending(n => n.PostedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<News?> GetByIdAsync(int id)
        {
            return await _context.News
                .Include(n => n.PostedByAdmin)
                .Include(n => n.Hearts)
                .Include(n => n.Comments.Where(c => !c.IsDeleted && c.ParentCommentId == null))
                    .ThenInclude(c => c.Student)
                .Include(n => n.Comments.Where(c => !c.IsDeleted && c.ParentCommentId == null))
                    .ThenInclude(c => c.Likes)
                .Include(n => n.Comments.Where(c => !c.IsDeleted && c.ParentCommentId == null))
                    .ThenInclude(c => c.Replies.Where(r => !r.IsDeleted))
                        .ThenInclude(r => r.Student)
                .Include(n => n.Comments.Where(c => !c.IsDeleted && c.ParentCommentId == null))
                    .ThenInclude(c => c.Replies.Where(r => !r.IsDeleted))
                        .ThenInclude(r => r.Likes)
                .Include(n => n.Comments.Where(c => !c.IsDeleted && c.ParentCommentId == null))
                    .ThenInclude(c => c.Replies.Where(r => !r.IsDeleted))
                        .ThenInclude(r => r.MentionedStudent)
                .Include(n => n.Comments.Where(c => !c.IsDeleted && c.ParentCommentId == null))
                    .ThenInclude(c => c.Replies.Where(r => !r.IsDeleted))
                        .ThenInclude(r => r.Replies.Where(rr => !rr.IsDeleted))
                            .ThenInclude(rr => rr.Student)
                .Include(n => n.Comments.Where(c => !c.IsDeleted && c.ParentCommentId == null))
                    .ThenInclude(c => c.Replies.Where(r => !r.IsDeleted))
                        .ThenInclude(r => r.Replies.Where(rr => !rr.IsDeleted))
                            .ThenInclude(rr => rr.Likes)
                .Include(n => n.Comments.Where(c => !c.IsDeleted && c.ParentCommentId == null))
                    .ThenInclude(c => c.Replies.Where(r => !r.IsDeleted))
                        .ThenInclude(r => r.Replies.Where(rr => !rr.IsDeleted))
                            .ThenInclude(rr => rr.MentionedStudent)
                                .FirstOrDefaultAsync(n => n.Id == id && !n.IsDeleted);
        }

        public async Task<News?> GetByIdIncludingDeletedAsync(int id)
        {
            return await _context.News
                .IgnoreQueryFilters()
                .Include(n => n.PostedByAdmin)
                .Include(n => n.Hearts)
                .FirstOrDefaultAsync(n => n.Id == id);
        }

        public async Task<List<News>> GetDeletedAsync()
        {
            return await _context.News
                .IgnoreQueryFilters()
                .Where(n => n.IsDeleted)
                .Include(n => n.PostedByAdmin)
                .Include(n => n.Hearts)
                .OrderByDescending(n => n.PostedAt)
                .ToListAsync();
        }

        public async Task<int> GetTotalCountAsync()
        {
            return await _context.News.CountAsync(n => n.IsPublished && !n.IsDeleted);
        }

        public async Task CreateAsync(News news)
        {
            await _context.News.AddAsync(news);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(News news)
        {
            _context.News.Update(news);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(News news)
        {
            _context.News.Remove(news);
            await _context.SaveChangesAsync();
        }

        public async Task<NewsHeart?> GetHeartAsync(int newsId, int studentId)
        {
            return await _context.NewsHearts
                .FirstOrDefaultAsync(h => h.NewsId == newsId && h.StudentId == studentId);
        }

        public async Task AddHeartAsync(NewsHeart heart)
        {
            await _context.NewsHearts.AddAsync(heart);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveHeartAsync(NewsHeart heart)
        {
            _context.NewsHearts.Remove(heart);
            await _context.SaveChangesAsync();
        }

        public async Task<NewsComment?> GetCommentByIdAsync(int commentId)
        {
            return await _context.NewsComments
                .Include(c => c.Student)
                .Include(c => c.Likes)
                .FirstOrDefaultAsync(c => c.Id == commentId);
        }

        public async Task AddCommentAsync(NewsComment comment)
        {
            await _context.NewsComments.AddAsync(comment);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateCommentAsync(NewsComment comment)
        {
            _context.NewsComments.Update(comment);
            await _context.SaveChangesAsync();
        }

        public async Task<NewsCommentLike?> GetCommentLikeAsync(int commentId, int studentId)
        {
            return await _context.NewsCommentLikes
                .FirstOrDefaultAsync(l => l.CommentId == commentId && l.StudentId == studentId);
        }

        public async Task AddCommentLikeAsync(NewsCommentLike like)
        {
            await _context.NewsCommentLikes.AddAsync(like);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveCommentLikeAsync(NewsCommentLike like)
        {
            _context.NewsCommentLikes.Remove(like);
            await _context.SaveChangesAsync();
        }
    }
}