using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEventPublishing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                table: "Events",
                type: "tinyint(1)",
                nullable: false,
                // Existing events were already public before publishing
                // states existed; preserve that behavior during backfill.
                defaultValue: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishAt",
                table: "Events",
                type: "datetime(6)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPublished",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "PublishAt",
                table: "Events");
        }
    }
}
