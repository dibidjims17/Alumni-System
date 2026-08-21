using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCommentReplies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MentionedStudentId",
                table: "NewsComments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ParentCommentId",
                table: "NewsComments",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_NewsComments_MentionedStudentId",
                table: "NewsComments",
                column: "MentionedStudentId");

            migrationBuilder.CreateIndex(
                name: "IX_NewsComments_ParentCommentId",
                table: "NewsComments",
                column: "ParentCommentId");

            migrationBuilder.AddForeignKey(
                name: "FK_NewsComments_NewsComments_ParentCommentId",
                table: "NewsComments",
                column: "ParentCommentId",
                principalTable: "NewsComments",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_NewsComments_Students_MentionedStudentId",
                table: "NewsComments",
                column: "MentionedStudentId",
                principalTable: "Students",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NewsComments_NewsComments_ParentCommentId",
                table: "NewsComments");

            migrationBuilder.DropForeignKey(
                name: "FK_NewsComments_Students_MentionedStudentId",
                table: "NewsComments");

            migrationBuilder.DropIndex(
                name: "IX_NewsComments_MentionedStudentId",
                table: "NewsComments");

            migrationBuilder.DropIndex(
                name: "IX_NewsComments_ParentCommentId",
                table: "NewsComments");

            migrationBuilder.DropColumn(
                name: "MentionedStudentId",
                table: "NewsComments");

            migrationBuilder.DropColumn(
                name: "ParentCommentId",
                table: "NewsComments");
        }
    }
}
