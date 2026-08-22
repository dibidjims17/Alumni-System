using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;
namespace MyApp.Infrastructure.Repositories
{
    public class AdminRepository : IAdminRepository
    {
        private readonly AppDbContext _context;
        public AdminRepository(AppDbContext context)
        {
            _context = context;
        }
        public async Task<Admin?> GetByUsernameAsync(string username)
        {
            return await _context.Admins
                .FirstOrDefaultAsync(a => a.Username == username);
        }
        public async Task<Admin?> GetByIdAsync(int id)
        {
            return await _context.Admins
                .FirstOrDefaultAsync(a => a.Id == id);
        }
        public async Task<List<Admin>> GetAllAsync()
        {
            return await _context.Admins
                .OrderBy(a => a.FullName)
                .ToListAsync();
        }
        public async Task CreateAsync(Admin admin)
        {
            _context.Admins.Add(admin);
            await _context.SaveChangesAsync();
        }
        public async Task UpdateAsync(Admin admin)
        {
            _context.Admins.Update(admin);
            await _context.SaveChangesAsync();
        }
    }
}